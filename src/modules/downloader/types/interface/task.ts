import { HintedString } from '@/utils/main.js';
import { Reactive } from 'vue';

// 注意：这里使用 typeof import() 但不实际导入，以避免循环引用
export type ProviderType = keyof typeof import('../../providers/main.js');

/**
 * 任务状态  
 * - `'queue'`: 任务创建完毕，在队列中随时可以开始执行
 * - `'ongoing'`: 任务执行中
 * - `'complete'`: 任务已执行完毕
 */
export type Status = 'queue' | 'ongoing' | 'complete' | 'aborted' | 'error';

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
 * 任务
 */
export interface ITask {
    /**
     * 全局唯一任务ID
     */
    id: string;

    /**
     * 任务类型  
     * 当实例化为任何非子类实例时，type应为`'task'`
     */
    type: HintedString<'task'>;

    /**
     * 任务进度  
     * 响应式对象
     */
    progress: Reactive<Progress>;

    /**
     * 开始执行任务  
     * 如果是同步任务，应在任务完成后返回  
     * 如果是异步任务，应当返回一个在任务完成时resolve的Promise  
     * 如果任务过程中出现错误，应当捕获错误并将任务状态设置为`'error'`
     */
    run: Function;

    /**
     * 终止任务  
     * 同样地，如果终止操作是异步的，应当返回一个在终止操作完成时resolve的Promise  
     * 如果任务过程中出现错误，应当捕获错误并保持任务状态不变
     * 仅当任务处于`'queue'`或`'ongoing'`状态时有效  
     */
    abort: Function;
}

/**
 * 待下载文件
 */
export interface DownloadFile {
    /**
     * 下载链接 / 文件地址
     */
    url: string;

    /**
     * 保存的文件名 / 路径
     */
    path: string;
}

/**
 * 下载任务  
 */
export interface IDownloadTask extends ITask {
    /**
     * 任务类型  
     * 当实例化为任何非子类实例时，type应为`'download'`
     */
    type: HintedString<'download'>;
    
    /**
     * 任务的人类可读名称  
     * 通常用于UI展示  
     * 当由于各种原因（如数据未加载完成等）缺失时，为`null`
     */
    name: string | null;

    /**
     * 开始下载  
     * 返回一个下载完成时resolve的Promise
     */
    run: () => Promise<unknown>;
}

/**
 * 单文件下载任务
 */
export interface IFileDownloadTask extends IDownloadTask {
    /**
     * 任务类型
     */
    type: HintedString<'file'>;

    file: DownloadFile;
}

/**
 * 多文件下载任务  
 * 对于每个待下载文件，均创建一个单文件下载任务
 */
export interface IMultiFileDownloadTask extends IDownloadTask {
    /**
     * 任务类型  
     * 当实例化为任何非子类实例时，type应为`'multifile'`
     */
    type: HintedString<'multifile'>;

    /**
     * 子下载任务列表  
     * 可以是文件下载任务，也可以是任何继承于文件下载任务的下载任务类型  
     * 响应式对象
     */
    subTasks: Reactive<IDownloadTask[]>;

    /**
     * 开始下载  
     * 返回一个下载完成时resolve的Promise
     */
    run: () => Promise<unknown>;
}
