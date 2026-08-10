import { globalStorage } from "@/storage";
import { $CrE, Nullable, ReplaceRule, safeBatchReplace } from "@/utils/main";
import { Conn } from "maria2";
import { v4 as uuid } from "uuid";
import type { FileSpec, ResourceMeta } from "../types/model.js";

const storage = globalStorage.withKeys('downloader');

/**
 * 推荐文件名模板变量词汇表  
 * 各站点adapter应尽量在资源meta中实现这些键，使用户可以用一套模板跨站适配
 */
export const RECOMMENDED_META_KEYS = [
    'PostID',
    'CreatorID',
    'Service',
    'Title',
    'Creator',
    'Year',
    'Month',
    'Date',
    'Hour',
    'Minute',
    'Second',
    'Timestamp',
    'TimeText',
] as const;

/**
 * 获取文件名模板（站点专属优先于通用）
 * @param siteId 站点ID（如`kemono`）；提供时优先使用该站点的专属模板
 */
export function getFilenameTemplate(siteId?: string): string {
    const bySite = storage.get('filenameBySite') as Record<string, string> | undefined;
    return bySite?.[siteId ?? ''] || storage.get('filename');
}

/**
 * 为一个文件，根据其祖先资源meta链和用户设置的文件名模板构建文件名（路径）
 * @param metaChain 祖先资源meta链（root在前，最近一层在后），键查找"就近优先"
 * @param file 文件信息（用于`Name`/`Base`/`Ext`等键）
 * @param p 该文件在当前资源文件列表中的序号（从1开始）
 * @param template 文件名模板，未传入时从存储读取
 * @param placeholder 当模板中某markup所需的信息在给定的信息中缺失时，该模板用什么填充；null代表使用markup的键名填充
 */
export function constructFilename(
    metaChain: ResourceMeta[],
    file: Nullable<Pick<FileSpec, 'name' | 'path'>>,
    p: number,
    template?: string,
    placeholder: Nullable<string> = null,
) {
    // 参数处理
    template = template ?? storage.get('filename');

    // 合并meta链（近者优先）
    const merged: ResourceMeta = {};
    for (const meta of metaChain) Object.assign(merged, meta);

    // 文件自身信息
    const origName = file ?
        file.name ?? (file.path ? file.path.substring(file.path.lastIndexOf('/') + 1) : null) :
        null;
    const dotIndex = origName?.lastIndexOf('.') ?? null;

    // 合成模板数据
    // 注：始终包含推荐词汇表全量键（缺失时为undefined→占位符），保证模板中的推荐键总能被解析
    const templateData: Record<string, undefined | null | string | number> = Object.assign(
        Object.fromEntries(RECOMMENDED_META_KEYS.map(key => [key, undefined])),
        merged,
        {
            P: p,
            Name: origName,
            Base: origName?.substring(0, dotIndex!),
            Ext: origName?.substring(dotIndex! + 1),
        }
    );

    // 模板数据转字符串，并将文件名非法字符转全角
    /**
     * 文件名非法字符与对应的全角字符映射表  
     * 目前只有windows版本，MacOS和Linux待补充
     */
    const replacements: Readonly<Record<string, string>> = {
        '<': '＜',
        '>': '＞',
        ':': '：',
        '"': '＂',
        '/': '／',
        '\\': '＼',
        '|': '｜',
        '?': '？',
        '*': '＊',
    };
    Object.entries(templateData).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
            for (const [char, repl] of Object.entries(replacements)) {
                val = val.toString().replaceAll(char, repl);
            }
            templateData[key] = val;
        }
    });

    // 合成文件名字符串
    const markups = Object.keys(templateData).filter(markup =>
        template!.toLowerCase().includes(markup.toLowerCase()));
    const rules: ReplaceRule[] = markups.map(markup => {
        const [key, val] = Object.entries(templateData)
            .find(([key, _val]) => key.toLowerCase() === markup.toLowerCase())!;
        const strPlaceholder = placeholder === null ? key : placeholder;
        return {
            search: '{' + key.toString() + '}',
            replace: val?.toString() ?? strPlaceholder,
        };
    })
    let filepath = safeBatchReplace(template!, rules);

    // 由于浏览器安全规则，文件名/文件夹名不得以空格和点号结尾（开头未测试），这里为了确保文件能保存，进行掐头去尾
    filepath = filepath
        .replaceAll(/(^|[/\\])[ .]+/g, '$1')
        .replaceAll(/[ .]+(^|[/\\])/g, '$1')

    // 返回文件名
    return filepath;
}

/**
 * 将帖子API中的文字内容html格式化渲染成人类可看html
 * @param html PostAPIResponse.post.content 中的原始html
 */
export function formatContentHTML(html: string) {
    return `<pre>${ html }</pre>`;
}

/**
 * 将帖子API中的文字内容html格式化渲染成人类可读txt文字
 * @param html PostAPIResponse.post.content 中的原始html
 */
export function formatContentText(html: string) {
    if (!document.body) throw new Error('document.body not exist');
    const div = $CrE('div', { props: { innerHTML: html } });
    document.body.append(div);
    const text = div.innerText;
    div.remove();
    return text;
}

interface Aria2Call {
    call: {
        methodName: string;
        params: any[];
    };
    callback: (response: any) => any;
}

/**
 * 统筹执行大量的周期性aria2调用
 */
export class Aria2IntervalCallsManager {
    private tasks: Record<string, Aria2Call> = {};

    /**
     * aria2实例  
     * 允许设置为null，设置为null时无法启动循环，如果循环已启动，则会自动停止
     */
    public aria2: Nullable<Conn>;

    /**
     * 调用执行周期
     */
    private interval: number;

    /**
     * 周期任务setInterval句柄  
     * 为空时表示周期任务不在运行
     */
    private handle: Nullable<number> = null;

    constructor(aria2: Nullable<Conn> = null, interval: number = 1000) {
        this.aria2 = aria2;
        this.interval = interval;
    }

    /**
     * 开始运行周期调用循环
     */
    run() {
        // 检查是否已经在运行
        if (this.handle !== null) return;

        // 开始周期执行
        this.handle = setInterval(async () => {
            if (this.aria2 === null) {
                this.stop();
                return;
            }
            if (Object.keys(this.tasks).length === 0) return;

            // 提取任务参数和回调
            const values = Object.values(this.tasks);
            const calls = structuredClone(values.map(call => call.call));
            const callbacks = values.map(call => call.callback);

            // multicall需要将secret填入每个call的params当中
            this.aria2.secret && calls.forEach(call => call.params.splice(0, 0, 'token:' + this.aria2!.secret));

            // multicall调用
            const results = await this.aria2.sendRequest<any[]>(
                { method: 'system.multicall', secret: false },
                calls,
            );
            this.aria2.sendRequest

            // 回调
            results.forEach((val, i) => 
                callbacks[i](Array.isArray(val) ? val[0] : val)
            );
        }, this.interval);
    }

    /**
     * 停止周期循环
     */
    stop() {
        this.handle !== null && clearInterval(this.handle);
        this.handle = null;
    }

    /**
     * 新增周期调用任务
     * @returns 任务id
     */
    add(call: Aria2Call): string {
        const id = uuid();
        this.tasks[id] = call;
        return id;
    }

    /**
     * 从周期循环中移除指定调用任务
     * @param id 任务id
     */
    remove(id: string) {
        delete this.tasks[id];
    }

    /**
     * 更改任务执行周期
     * @returns 新的任务执行周期
     */
    setInterval(val: number) {
        this.interval = val;

        // 使用新的interval重新开始周期循环
        if (this.handle !== null) {
            this.stop();
            this.run();
        }
        return val;
    }

    /**
     * 获取当前任务执行周期
     */
    getInterval() {
        return this.interval;
    }

    /**
     * 当前周期调用循环是否在运行中
     * @readonly
     */
    get isRunning() {
        return this.handle !== null;
    }
}
