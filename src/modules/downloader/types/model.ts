import type { Reactive } from "vue";
import type { Nullable, PromiseOrRaw } from "@/utils/main.js";

/**
 * 任务状态  
 * - `'init'`: 任务创建完毕，正在初始化，目前尚未准备好执行
 * - `'queue'`: 任务创建完毕且初始化完毕，在队列中随时可以开始执行
 * - `'ongoing'`: 任务执行中
 * - `'paused'`: 任务被暂停
 * - `'complete'`: 任务已执行完毕
 * - `'aborted'`: 任务被取消/终止
 * - `'error'`: 任务出现错误
 */
export type Status = 'init' | 'queue' | 'ongoing' | 'paused' | 'complete' | 'aborted' | 'error';

/**
 * 进度
 */
export interface Progress {
    /**
     * 任务状态
     */
    status: Status;

    /**
     * 任务总量  
     * 仅当任务状态为`'ongoing'`时有效  
     * 当由于任何原因导致此属性无效/无值时应设为`-1`
     */
    total: number;

    /**
     * 已完成数量  
     * 仅当任务状态为`'ongoing'`时有效  
     * 当由于任何原因导致此属性无效/无值时应设为`-1`
     */
    finished: number;
}

/**
 * 文件名模板元数据  
 * 键为模板变量名（如`Title`、`Creator`），值为对应数据  
 * 由 site adapter 在展开资源时填充，模板引擎按"就近优先"合并祖先链
 */
export type ResourceMeta = Record<string, string | number | null>;

/**
 * 资源内的文件（叶子内容）  
 * - `download`: 需要网络请求下载的文件（附件、封面图等）
 * - `save`: 无需网络请求、直接保存内存/页面中提取数据的文件（文字内容、页面快照等）
 */
export type FileSpec =
    | {
        kind: 'download';
        name: string;
        /** 服务器上的原始路径（用于文件命名等） */
        path: string;
        /** 完整下载地址（由 site adapter 的 assets 生成） */
        url: string;
        size?: number;
        checksum?: string;
    }
    | {
        kind: 'save';
        name: string;
        path: string;
        data: string | Blob | File | FileSystemFileHandle;
    };

/**
 * 可下载资源（任意可嵌套的可下载单元）  
 * 站点无关的领域模型：site adapter 负责把站点数据展开成资源树，下载器只消费此模型
 */
export interface Resource {
    /**
     * 资源ID（站点内唯一即可）
     */
    id: string;

    /**
     * 语义类型  
     * 由 site adapter 定义（如`post`、`posts`、`creator`、`server`、`channel`），驱动图标/文案展示
     */
    type: string;

    /**
     * 资源的人类可读名称  
     * 展开前可能为`null`
     */
    name: Nullable<string>;

    /**
     * 文件名模板元数据  
     * 由 site adapter 的展开逻辑填充
     */
    meta: ResourceMeta;

    /**
     * 本层包含的文件（叶子内容）
     */
    files?: FileSpec[];

    /**
     * 嵌套的子资源（递归）
     */
    children?: Resource[];

    /**
     * 资源内容是否完整可用  
     * `false` 表示仅预览（如部分存档站尚未导入完成的帖子），文件列表可能为空或仅为缩略图
     */
    available?: boolean;

    /**
     * 站点内部定位信息（如API参数）  
     * 仅由产生该资源的 site adapter 的`expand`理解，其他模块不得访问
     */
    source?: unknown;
}

/**
 * 叶子任务的目标文件  
 * 由资源任务在展开后根据`FileSpec`与文件名模板生成
 */
export interface DownloadTarget {
    kind: 'download' | 'save';
    /**
     * 最终保存路径（文件名模板结果）
     */
    path: string;
    /**
     * 下载地址（`kind === 'download'`时必填）
     */
    url?: string;
    /**
     * 内存数据（`kind === 'save'`时必填）
     */
    data?: string | Blob | File | FileSystemFileHandle;
}

/**
 * 展开函数  
 * 由 site adapter 提供：将stub资源（只有`source`）展开为实体（填充`name`/`meta`/`files`/`children`）
 */
export type ExpandFn = (resource: Resource) => Promise<void>;

/**
 * 任务树的公共视图  
 * 执行层（资源任务/文件任务）与GUI层共同依赖的结构类型
 */
interface TaskBase {
    /**
     * 全局唯一任务ID
     */
    id: string;

    /**
     * 当前实现隶属于哪个provider实现
     */
    provider: string;

    /**
     * 任务的人类可读名称  
     * 当数据未加载完成时为`null`
     */
    name: Nullable<string>;

    /**
     * 任务进度（响应式对象）
     */
    progress: Reactive<Progress>;

    /**
     * 当任务初始化完毕时resolve的promise
     */
    init: Promise<void>;

    /**
     * 父级任务
     */
    parent: Nullable<TaskLike>;

    /**
     * 子任务列表
     */
    subTasks: TaskLike[];

    /**
     * 开始执行任务  
     * 返回一个任务完成时resolve的Promise
     */
    run: () => PromiseOrRaw<unknown>;

    /**
     * 暂停任务  
     * 不支持的provider应抛出{@link FeatureNotSupportedError}
     */
    pause: () => PromiseOrRaw<unknown>;

    /**
     * 取消暂停任务
     */
    unpause: () => PromiseOrRaw<unknown>;

    /**
     * 终止任务
     * @param deleteFiles 是否删除该任务已下载的文件
     */
    abort: (deleteFiles?: boolean) => PromiseOrRaw<unknown>;

    /**
     * 重试任务失败部分
     */
    retry: () => PromiseOrRaw<unknown>;
}

/**
 * 任务：递归容器（持有资源，展开并执行子任务树）或叶子（下载/保存单个文件）
 */
export type TaskLike =
    | (TaskBase & {
        type: 'resource';
        /**
         * 该任务对应的资源
         */
        resource: Resource;
    })
    | (TaskBase & {
        type: 'file';
        /**
         * 目标文件
         */
        target: DownloadTarget;
    });

/**
 * 任务结构类型（与{@link TaskLike}的`type`字段一致）
 */
export type TaskType = TaskLike['type'];
