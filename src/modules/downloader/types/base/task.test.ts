import { beforeEach, describe, expect, it, vi } from 'vitest';

// —— mock：避免加载浏览器UI/i18n相关模块 ——

vi.mock('@/i18n/main.js', () => ({
    default: { global: { t: (key: string) => key } },
}));
vi.mock('@/utils/helpers/toast/main.js', () => ({
    toast: Object.assign(() => {}, { add: () => {}, remove: () => {} }),
}));
vi.mock('@/styling.js', () => ({
    styling: { applyTo: () => () => {} },
}));

import { BaseFileTask, BaseResourceTask } from './task.js';
import type { DownloadTarget, ExpandFn, Resource } from '../model.js';

/** 测试用叶子任务：立即完成 */
class FakeFileTask extends BaseFileTask {
    public provider = 'fake';
    public runCalls = 0;

    async run(): Promise<void> {
        this.runCalls++;
        this.progress.status = 'complete';
        this.progress.finished = this.progress.total = 1;
    }
    pause(): void {}
    unpause(): void {}
    abort(_deleteFiles?: boolean): void {
        this.progress.status = 'aborted';
    }
    retry(): void {
        this.progress.status = 'complete';
    }
}

/** 测试用叶子任务：可配置失败 */
class FailingFileTask extends FakeFileTask {
    async run(): Promise<void> {
        this.progress.status = 'error';
    }
}

/** 测试用叶子任务：run挂起直至abort，用于测试终止级联 */
class HangingFileTask extends FakeFileTask {
    private resolveRun: () => void = () => {};

    async run(): Promise<void> {
        await new Promise<void>(resolve => { this.resolveRun = resolve; });
        // 与真实文件任务一致：终止后不再标记完成
        if (this.progress.status !== 'aborted') {
            this.progress.status = 'complete';
        }
    }

    abort(_deleteFiles?: boolean): void {
        this.progress.status = 'aborted';
        this.resolveRun();
    }
}

/** 构造一个资源任务，展开时填充指定文件与子资源 */
function makeResourceTask(options?: {
    files?: Resource['files'];
    children?: Resource['children'];
    expand?: ExpandFn;
    template?: string;
    features?: string[];
    fileTaskFactory?: (parent: BaseResourceTask, target: DownloadTarget) => BaseFileTask;
}) {
    const expand = options?.expand ?? vi.fn(async (resource: Resource) => {
        resource.name = 'Test Resource';
        resource.meta = { Title: 'T', Creator: 'C' };
        resource.files = options?.files ?? [{
            kind: 'download', name: 'a.jpg', path: '/a.jpg', url: 'https://x/a.jpg',
        }];
        resource.children = options?.children;
    });
    const resource: Resource = {
        id: 'r1', type: 'post', name: null, meta: {}, source: {},
    };
    const task = new BaseResourceTask(null, resource, {
        provider: 'fake',
        features: (options?.features ?? []) as never,
        template: options?.template ?? '{Name}',
        expand,
        fileTaskFactory: options?.fileTaskFactory ?? ((parent, target) => new FakeFileTask(parent, target)),
    });
    return { task, resource, expand };
}

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('BaseResourceTask', () => {
    it('init时展开资源并构建文件子任务（应用文件名模板）', async () => {
        const { task, resource, expand } = makeResourceTask({ template: '{Title}_{Name}' });
        await task.init;

        expect(expand).toHaveBeenCalledWith(resource);
        expect(task.name).toBe('Test Resource');
        expect(task.subTasks).toHaveLength(1);
        expect(task.subTasks[0].type).toBe('file');
        // 文件名模板已应用（meta链 + 文件信息）
        expect((task.subTasks[0] as BaseFileTask).target.path).toBe('T_a.jpg');
        expect(task.progress.total).toBe(1);
    });

    it('run递归执行子任务并聚合进度与状态', async () => {
        const { task } = makeResourceTask({ files: [
            { kind: 'download', name: 'a.jpg', path: '/a.jpg', url: 'https://x/a.jpg' },
            { kind: 'download', name: 'b.jpg', path: '/b.jpg', url: 'https://x/b.jpg' },
        ] });
        await task.init;
        await task.run();

        expect(task.progress.status).toBe('complete');
        expect(task.progress.finished).toBe(2);
        expect((task.subTasks[0] as FakeFileTask).runCalls).toBe(1);
    });

    it('任一子任务失败时任务整体为error', async () => {
        const { task } = makeResourceTask({
            files: [
                { kind: 'download', name: 'a.jpg', path: '/a.jpg', url: 'https://x/a.jpg' },
                { kind: 'download', name: 'b.jpg', path: '/b.jpg', url: 'https://x/b.jpg' },
            ],
            fileTaskFactory: (parent, target) =>
                target.name === 'a.jpg' ?
                    new FakeFileTask(parent, target) :
                    new FailingFileTask(parent, target),
        });
        await task.init;
        await task.run();

        expect(task.progress.status).toBe('error');
        expect(task.progress.finished).toBe(1);
    });

    it('abort级联终止子任务并保持aborted状态', async () => {
        const { task } = makeResourceTask({
            fileTaskFactory: (parent, target) => new HangingFileTask(parent, target),
        });
        await task.init;

        // 开始运行（子任务挂起）
        const runPromise = task.run();
        await new Promise(resolve => setTimeout(resolve, 10));
        await task.abort(false);
        await runPromise;

        expect(task.progress.status).toBe('aborted');
        expect(task.subTasks[0].progress.status).toBe('aborted');
    });

    it('展开失败时任务进入error，retry重新展开并执行', async () => {
        let fail = true;
        const expand: ExpandFn = async (resource) => {
            if (fail) throw new Error('network error');
            resource.name = 'Retried';
            resource.meta = {};
            resource.files = [{
                kind: 'download', name: 'a.jpg', path: '/a.jpg', url: 'https://x/a.jpg',
            }];
        };
        const { task } = makeResourceTask({ expand });

        await task.init;
        expect(task.progress.status).toBe('error');
        expect(task.subTasks).toHaveLength(0);

        // 恢复网络并重试
        fail = false;
        await task.retry();

        expect(task.progress.status).toBe('complete');
        expect(task.name).toBe('Retried');
        expect(task.subTasks).toHaveLength(1);
    });

    it('pause在不支持pause feature时抛出FeatureNotSupportedError', async () => {
        const { task } = makeResourceTask({ features: [] });
        await task.init;
        expect(() => task.pause()).toThrow('Feature not supported');
    });

    it('pause在支持pause feature时转发给子任务并置为paused', async () => {
        const { task } = makeResourceTask({ features: ['pause'] });
        await task.init;
        await task.pause();
        expect(task.progress.status).toBe('paused');
    });

    it('支持嵌套子资源：children递归构建子任务', async () => {
        const { task } = makeResourceTask({
            expand: async (resource) => {
                resource.name = 'Root';
                resource.meta = {};
                if (resource.id === 'r1') {
                    // 根资源：声明一个子资源
                    resource.children = [{
                        id: 'child', type: 'post', name: null, meta: {}, source: {},
                    }];
                } else {
                    // 子资源：填充文件
                    resource.name = 'Child';
                    resource.files = [{
                        kind: 'download', name: 'c.jpg', path: '/c.jpg', url: 'https://x/c.jpg',
                    }];
                }
            },
        });
        await task.init;

        expect(task.subTasks).toHaveLength(1);
        expect(task.subTasks[0].type).toBe('resource');
        await task.run();
        expect(task.progress.status).toBe('complete');
        expect(task.progress.finished).toBe(1);
        // 子资源的文件任务也存在
        expect((task.subTasks[0] as BaseResourceTask).subTasks).toHaveLength(1);
    });
});
