import { console } from "@/hooks.js";
import { GM_info } from "$";
import { Ref, toRaw, watch } from "vue";
import { Nullable } from "../main";

/** @satisfies {Record<string, (...args: any[]) => boolean>} */
const checkers = {
    'switch': (val: any) => !!val,
    'url': (val: string) => location.href === val,
    'path': (val: string) => location.pathname === val,
    'host': (val: string) => location.host === val,
    'regurl': (val: RegExp) => !!location.href.match(val),
    'regpath': (val: RegExp) => !!location.pathname.match(val),
    'reghost': (val: RegExp) => !!location.host.match(val),
    'starturl': (val: string) => location.href.startsWith(val),
    'startpath': (val: string) => location.pathname.startsWith(val),
    'endhost': (val: string) => location.host.endsWith(val),
    'func': (val: Function) => !!val(),
};

export type CheckerType = keyof typeof checkers;

export type Checker = {
    [T in CheckerType]: {
        /** 类型 */
        type: T;
        /** 值 */
        value: Parameters<typeof checkers[T]>[0];
        /** 是否反转判断结果 */
        invert?: boolean;
    }
}[CheckerType];

/**
 * 检查给定checker是否通过
 */
export function testChecker(
    checker: Checker | Checker[],
    mode: 'and' | 'or' = 'or',
): boolean {
    if (Array.isArray(checker)) {
        // 数组场景
        if (mode === 'and')
            return checker.every(c => testChecker(c));
        else
            return checker.some(c => testChecker(c))
    }

    // 单个 Checker 场景：调用对应 checker 函数
    const result = checkers[checker.type](checker.value);

    // 利用 !== 运算符实现反转逻辑
    const invert = !!checker.invert;
    return invert !== result;
}

type LogLevel = keyof typeof Logger.Level;
type LogLevelNum = typeof Logger.Level[LogLevel];
type ConsoleMethods = {
    [K in keyof Console]: Console[K] extends (...args: any[]) => any ? K : never
}[keyof Console];

class Logger {
    /**
     * 日志等级，数值越大越容易实际输出
     */
    public static readonly Level = {
        /** 调试输出，必须对用户不可见 */
        Debug: 0 as 0,

        /** 详细信息输出 */
        Detail: 1 as 1,

        /** 常规信息输出 */
        Info: 2 as 2,

        /** 警告信息输出，用于输出不影响运行的异常等 */
        Warning: 3 as 3,

        /** 错误信息输出，用于输出影响运行的错误 */
        Error: 4 as 4,

        /** 重要信息输出，应当对用户可见 */
        Important: 5 as 5,
    };

    /**
     * 当前日志输出等级
     * @default Logger.Level.Info
     */
    public level: LogLevelNum = Logger.Level.Info;

    /**
     * 日志等级所对应的纯文本输出颜色
     */
    public static readonly LevelColor: Record<LogLevel, string> = {
        Debug: '#94a3b8',
        Detail: '#10b981',
        Info: 'inherit',
        Warning: '#f59e0b',
        Error: '#ef4444',
        Important: '#a855f7',
    };

    /**
     * 纯文本日志输出的前缀的颜色
     */
    public static readonly PrefixColor = '#6366f1';

    /**
     * 纯文本日志输出的路径前缀的颜色
     * 在浅色和深色模式下都清晰可见，比脚本名称更显眼
     */
    public static readonly PrefixPathColor = '#f97316';

    /**
     * 记录当前logger所属的作用域路径，在输出时可用作前缀以帮助调试辨识日志来源
     */
    public prefixPath: string[] = [];

    constructor({
        level = Logger.Level.Info,
        path = [],
    }: {
        /** 日志输出等级 */
        level?: LogLevel | LogLevelNum,
        /** logger所属作用域路径 */
        path?: string[]
    } = {}) {
        this.level = typeof level === 'string' ?
            Logger.Level[level] : level;
        this.prefixPath.push(...path);
    }

    /**
     * 写文本日志
     * @param level 此条日志的等级
     * @param type 根据level格式化的纯文本消息
     * @param content 文本消息内容
     * @returns 根据此条日志的等级和当前输出等级，此条日志最终是否被输出
     */
    log(level: LogLevel, type: 'string', logger: ConsoleMethods, content: string): boolean

    /**
     * 写任意类型日志
     * @param level 此条日志的等级
     * @param type 按原样输出的任意类型数据
     * @param content 日志数据内容
     * @returns 根据此条日志的等级和当前输出等级，此条日志最终是否被输出
     */
    log(level: LogLevel, type: 'raw', logger: ConsoleMethods, ...content: any[]): boolean

    log(
        level: LogLevel,
        type: 'string' | 'raw',
        logger: ConsoleMethods = 'log',
        ...content: any[]
    ): boolean {
        // 仅当等级达到当前输出等级及以上时才输出
        const numLevel = Logger.Level[level];
        if (numLevel < this.level) return false;

        // 纯文本输出：按照预定义颜色格式化
        if (isStringLog(content)) {
            const prefix = this.prefixPath.join('.');
            content = [
                `%c[${GM_info.script.name}] %c[${prefix}] %c[${level}]\n${content[0]}`,
                `color: ${Logger.PrefixColor};`,
                `color: ${Logger.PrefixPathColor};`,
                `color: ${Logger.LevelColor[level]};`,
            ];
        }

        console[logger].apply(null, content);

        return true;

        // @ts-ignore: Unused parameter
        function isStringLog(content: any[]): content is string[] {
            return type === 'string';
        }
    }

    /**
     * 简化调用：写字符串日志
     */
    simple(level: LogLevel, content: string): ReturnType<typeof this.log> {
        return this.log(level, 'string', 'log', content);
    }

    /**
     * 从当前logger衍生一个新的、拥有更深一层作用域路径的logger实例
     * @param name 新增作用域层名称
     */
    withPath(name: string, ...names: string[]) {
        return new Logger({
            level: this.level,
            path: this.prefixPath.concat(name, ...names),
        });
    }
}

export const logger = new Logger();
logger.level = import.meta.env.PROD ? Logger.Level.Info : Logger.Level.Debug;

export const buildCssText = (styles: Record<string, string>) => Object.entries(styles).map(([key, val]) => `${key}: ${val};`).join(' ');

/**
 * 深度比较两个值是否相等（值相等，不要求引用相等）
 * 本函数由deepseek编写的代码再编辑而成
 * @param value1 - 第一个值
 * @param value2 - 第二个值
 * @param sorting - 是否考虑顺序（数组元素顺序、对象属性顺序等）
 * @returns 如果两个值深度相等则返回true，否则返回false
 */
export function deepEqual(value1: any, value2: any, sorting: boolean = true): boolean {
    // 处理基本类型的快速比较
    if (value1 === value2) return true;

    // 处理null和undefined
    if (value1 == null || value2 == null) {
        return value1 === value2;
    }

    // 处理NaN
    if (Number.isNaN(value1) && Number.isNaN(value2)) return true;

    // 检查类型是否一致
    if (typeof value1 !== typeof value2) return false;

    // 处理基本类型（经过前面的比较，这里肯定不相等）
    if (typeof value1 !== "object") return false;

    // 处理数组
    if (Array.isArray(value1)) {
        if (!Array.isArray(value2)) return false;
        if (value1.length !== value2.length) return false;

        // 如果考虑顺序，直接按顺序比较
        if (sorting) {
            for (let i = 0; i < value1.length; i++) {
                if (!deepEqual(value1[i], value2[i], sorting)) {
                    return false;
                }
            }
            return true;
        }

        // 如果不考虑顺序，需要检查每个元素是否在另一个数组中存在
        const arr2Copy = [...value2];
        for (const item1 of value1) {
            let found = false;
            for (let j = 0; j < arr2Copy.length; j++) {
                if (deepEqual(item1, arr2Copy[j], sorting)) {
                    arr2Copy.splice(j, 1);
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    // 处理对象
    if (typeof value1 === "object" && typeof value2 === "object") {
        const keys1 = Object.keys(value1);
        const keys2 = Object.keys(value2);

        // 检查key数量
        if (keys1.length !== keys2.length) return false;

        // 如果考虑顺序，先检查key顺序是否一致
        if (sorting) {
            for (let i = 0; i < keys1.length; i++) {
                if (keys1[i] !== keys2[i]) return false;
            }
        } else {
            // 如果不考虑顺序，检查key集合是否相同
            const keys1Set = new Set(keys1);
            for (const key of keys2) {
                if (!keys1Set.has(key)) return false;
            }
        }

        // 递归比较每个属性值
        for (const key of keys1) {
            if (!deepEqual(value1[key], value2[key], sorting)) {
                return false;
            }
        }
        return true;
    }

    // 其他情况（如Date、RegExp等）可以在这里添加特殊处理
    // 目前简单转为字符串比较
    return String(value1) === String(value2);
}

/**
 * 队列任务
 */
interface Task {
    /**
     * 任务执行的函数/方法
     */
    func: Function;

    /**
     * 任务完成时，提交返回值的回调
     */
    resolve: Function;

    /**
     * 任务报错时，处理错误的回调
     */
    reject: Function;

    /**
     * 任务状态
     */
    status: 'queue' | 'ongoing' | 'resolved' | 'rejected';
};

interface QueueConfig {
    /**
     * 最大同时执行任务数量
     * @default 3
     */
    max: number;

    /**
     * 从一个任务结束，到新任务开始，中间需要等待的时间（毫秒）
     * @default 500
     */
    sleep: number;

    /**
     * 任务结束后，是否在任务队列中保留任务
     * @default false
     */
    preserve: boolean;
}

/**
 * 任务队列类
 */
export class Queue {
    /**
     * 任务列表
     */
    private tasks: Task[] = [];

    /**
     * 正在执行的任务数量
     */
    private ongoing: number = 0;

    /**
     * 队列配置
     */
    private config: QueueConfig;

    /**
     * 创建一个新的任务队列
     * @param config 队列配置
     */
    constructor(config?: Partial<QueueConfig>) {
        this.config = {
            max: config?.max ?? 3,
            sleep: config?.sleep ?? 500,
            preserve: config?.preserve ?? false,
        };
    }

    /**
     * 将给定函数/方法排队执行，以限制并发数和执行频率
     * @param func 排队执行的函数/方法
     * @param signal 一个{@link AbortSignal}，当被abort时从队列移除此任务（如果任务已在执行中或已执行完毕，仍可从队列中移除，但无法终止任务）
     */
    enqueue<R>(func: () => R, signal?: AbortSignal): Promise<Awaited<R>> {
        const { promise, reject, resolve } = Promise.withResolvers<Awaited<R>>();
        const task: Task = { func, reject, resolve, status: 'queue' };
        this.tasks.push(task);

        // 任务结束时进行清理
        promise.then(() => {
            // 更新任务状态
            task.status = 'resolved';
        }).catch(() => {
            // 更新任务状态
            task.status = 'rejected';
        }).finally(() => {
            // 释放任务并行槽位
            this.ongoing--;
            // 从队列移除任务
            this.config.preserve || this.tasks.splice(this.tasks.indexOf(task), 1);
            // 检查是否有待执行的任务
            this.checkTask();
        })

        // 处理abort
        signal?.addEventListener('abort', () => task.reject('aborted'));

        // 排队执行
        this.checkTask();

        // 返回最终以原返回值resolve的Promise
        return promise;
    }

    /**
     * 检查是否有空闲的并行执行槽位，如果有就将一个任务出队执行
     */
    private checkTask() {
        while (this.ongoing < this.config.max) {
            const task = this.tasks.find(t => t.status === 'queue');
            if (!task) break;
            this.run(task);
        }
    }

    /**
     * 执行给定队列任务
     * @param task 任务
     */
    private run(task: Task) {
        // 申请任务并行槽位
        this.ongoing++;

        // 更新任务状态
        task.status = 'ongoing';

        // 根据队列配置延迟执行任务
        setTimeout(async () => {
            try {
                // 执行任务，兼容同步任务和Promise异步任务
                const val = await Promise.resolve(task.func());
                // 执行完毕，回调返回值
                task.resolve(val);
            } catch (err) {
                // 出现错误，reject
                task.reject(err);
            }
        }, this.config.sleep);
    }

    /**
     * 获取队列当前状态
     */
    getStatus() {
        return {
            pending: this.tasks.length,
            ongoing: this.ongoing,
            maxConcurrent: this.config.max,
            sleepBetweenTasks: this.config.sleep,
        };
    }

    /**
     * 清空队列中所有待执行的任务
     */
    clear() {
        // 拒绝所有待执行的任务
        for (const task of this.tasks) {
            task.reject(new Error('Queue cleared'));
        }
        this.tasks = [];
    }
}

/**
 * 对传入的响应式数组中的每个元素执行`load`回调，包括调用时就有的元素和未来新增的元素  
 * 当未来从该响应式数组中移除元素时，对其执行`unload`回调
 * @param listRef 
 * @param load 
 * @param unload 
 */
export function useListEffect<T>(
    listRef: Ref<T[]>,
    load: (elm: T, ...rest: any[]) => any,
    unload?: (elm: T, ...rest: any[]) => any
) {
    const processed = new Set<T>();

    watch(listRef, (curr) => {
        const nextSet = new Set(toRaw(curr));

        // Unload removed
        processed.forEach(item => {
            if (!nextSet.has(item)) {
                unload?.(item);
                processed.delete(item);
            }
        });

        // Load added
        nextSet.forEach(item => {
            if (!processed.has(item)) {
                load(item);
                processed.add(item);
            }
        });
    }, { deep: false, immediate: true });
}


/**
 * 块接口：用于区分普通文本和已替换的固定内容
 */
export interface TextChunk {
    text: string;
    fixed: boolean;
}

/**
 * 替换配置项
 */
export interface ReplaceRule {
    search: string;
    replace: string;
}

/**
 * 安全的批量替换函数
 * 确保后序规则不会影响前序规则生成的结果
 */
export function safeBatchReplace(input: string, rules: ReplaceRule[]): string {
    // 初始状态：整个字符串作为一个未锁定的块
    let chunks: TextChunk[] = [{ text: input, fixed: false }];

    // 遍历每一条替换规则
    rules.forEach(({ search, replace }) => {
        // search 不能为空字符串，否则 split 会导致死循环或异常
        if (!search) return;

        const nextChunks: TextChunk[] = [];

        chunks.forEach((chunk) => {
            // 如果块已经标记为 fixed（即被之前的规则处理过），直接保留
            if (chunk.fixed) {
                nextChunks.push(chunk);
                return;
            }

            // 对未锁定的块进行拆分
            const parts = chunk.text.split(search);

            parts.forEach((part, index) => {
                // 1. 放入非匹配部分（标记为未锁定，可能被后续规则匹配）
                if (part !== "") {
                    nextChunks.push({ text: part, fixed: false });
                }

                // 2. 在两个分割点之间插入替换后的内容（标记为锁定）
                // index < parts.length - 1 表示这不是最后一部分
                if (index < parts.length - 1) {
                    nextChunks.push({ text: replace, fixed: true });
                }
            });
        });

        // 更新 chunks，进入下一轮规则匹配
        chunks = nextChunks;
    });

    // 最后将所有块合并
    return chunks.map((c) => c.text).join("");
}

/**
 * 创建防抖函数
 * @param func 需要防抖的原始函数
 * @param wait 最小执行器间隔（单位：毫秒），默认为250
 * @param immediate 当在防抖时间内多次被调用时，执行第一次调用而不是最后一次调用，默认为false
 * @returns 防抖的函数，在给定wait内无论被调用多少次，最多被实际执行一次；
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number = 250,
    immediate: boolean = false
): (...args: Parameters<T>) => void {
    let timeout: Nullable<ReturnType<typeof setTimeout>> = null;

    return function(this: any, ...args: Parameters<T>): void {
        if (immediate && timeout === null) {
            // 在接下来的防抖时间内timeout有值，阻止重复执行
            timeout = setTimeout(() => timeout = null, wait);
            // 立即执行原始函数
            func.apply(this, args);
        } else {
            // 清除之前规划的执行任务
            timeout !== null && clearTimeout(timeout);
            // 重新规划防抖时段后执行
            timeout = setTimeout(() => {
                func.apply(this, args);
                timeout = null;
            }, wait);
        }
    };
}
