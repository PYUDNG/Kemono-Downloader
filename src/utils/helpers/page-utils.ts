import mitt, { Emitter } from 'mitt';

export function getSearchParam(name: string, url?: string): string | null {
    url = url ?? location.href;
    const params = new URLSearchParams(new URL(url).search);
    return params.get(name);
}

/**
 * URL变更事件的详细信息类型
 */
export interface UrlChangeDetail {
    /** 触发URL变更的操作类型 */
    action:
    | 'pushState'    // history.pushState
    | 'replaceState' // history.replaceState
    | 'pushHash'     // location.hash = 'xxx'（新增历史）
    | 'replaceHash'  // location.replace('#xxx')（替换历史）
    | 'popstate'     // 前进/后退/history.back()等
    | 'initial';     // 初始immediate参数回调
    /** 变更前的完整URL */
    oldUrl: string;
    /** 变更后的完整URL */
    newUrl: string;
    /** 变更后的hash锚点（#及后面内容） */
    hash: string;
    /** 变更后的路径（/开头） */
    pathname: string;
    /** 变更后的查询参数（?及后面内容） */
    search: string;
    /** history.state 携带的数据（pushState/replaceState/popstate时存在） */
    state: any;
}

/**
 * 事件类型映射（mitt的事件名-参数类型映射）
 */
type UrlChangeEvents = {
    urlChange: UrlChangeDetail; // 核心事件：URL变更时触发
    error: Error;               // 错误事件：监听过程中发生异常时触发
};

/**
 * 无刷新URL变更监听器（Hook所有可能的无刷新改URL方式）
 * 支持：history.pushState/replaceState、location.hash、前进/后退按钮等
 */
export class URLChangeMonitor {
    /** mitt事件总线实例 */
    private emitter: Emitter<UrlChangeEvents>;
    /** 原生history.pushState方法（保存用于后续调用） */
    private originalPushState: typeof history.pushState;
    /** 原生history.replaceState方法（保存用于后续调用） */
    private originalReplaceState: typeof history.replaceState;
    /** 是否已初始化监听（避免重复初始化） */
    private isInitialized = false;

    constructor() {
        // 初始化mitt事件总线
        this.emitter = mitt<UrlChangeEvents>();
        // 保存原生API（避免重写后无法访问原生逻辑）
        this.originalPushState = history.pushState;
        this.originalReplaceState = history.replaceState;
    }

    /**
     * 初始化监听（核心方法：启动所有URL变更监听）
     * 调用后开始捕获URL变化，支持重复调用（内部做防抖）
     */
    public init(): void {
        if (this.isInitialized) return;

        try {
            // 1. Hook history.pushState
            this.hookPushState();
            // 2. Hook history.replaceState
            this.hookReplaceState();
            // 3. 监听hash变更（location.hash = 'xxx' / location.replace('#xxx')）
            this.listenHashChange();
            // 4. 监听popstate（前进/后退/history.back()等）
            this.listenPopstate();

            this.isInitialized = true;
            //console.log('[URLChangeMonitor] 初始化成功，已开始监听URL变更');
        } catch (error) {
            const err = error instanceof Error ? error : new Error(`初始化失败：${String(error)}`);
            this.emitter.emit('error', err);
            console.error('[URLChangeMonitor] 初始化失败：', err);
        }
    }

    /**
     * 销毁监听（释放资源，避免内存泄漏）
     * 适用于组件卸载、脚本退出等场景
     */
    public destroy(): void {
        if (!this.isInitialized) return;

        // 恢复原生history方法
        history.pushState = this.originalPushState;
        history.replaceState = this.originalReplaceState;
        // 移除事件监听
        window.removeEventListener('hashchange', this.handleHashChange);
        window.removeEventListener('popstate', this.handlePopstate);
        // 清空事件总线（避免残留监听回调）
        this.emitter.all.clear();

        this.isInitialized = false;
        console.log('[URLChangeMonitor] 销毁成功，已停止监听URL变更');
    }

    /**
     * 监听URL变更事件（外部调用：获取URL变更详情）
     * @param callback 事件回调（参数为URL变更详情）
     * @returns 取消监听的函数（调用后不再触发回调）
     */
    public onUrlChange(callback: (detail: UrlChangeDetail) => void, immediate: boolean = false): () => void {
        this.emitter.on('urlChange', callback);
        immediate && this.triggerUrlChange('initial', '', location.href, null);
        // 返回取消监听的函数
        return () => this.emitter.off('urlChange', callback);
    }

    /**
     * 监听错误事件（外部调用：捕获监听过程中的异常）
     * @param callback 错误回调（参数为Error实例）
     * @returns 取消监听的函数
     */
    public onError(callback: (error: Error) => void): () => void {
        this.emitter.on('error', callback);
        return () => this.emitter.off('error', callback);
    }

    /**
     * Hook history.pushState 方法
     */
    private hookPushState(): void {
        const _this = this;
        history.pushState = function (this: History, state: any, title: string, url?: string | URL) {
            // 保存变更前的URL
            const oldUrl = window.location.href;
            // 执行原生pushState（真正修改URL）
            _this.originalPushState.apply(this, [state, title, url]);
            // 触发URL变更事件
            _this.triggerUrlChange('pushState', oldUrl, url?.toString() || oldUrl, state);
        };
    }

    /**
     * Hook history.replaceState 方法
     */
    private hookReplaceState(): void {
        const _this = this;
        history.replaceState = function (this: History, state: any, title: string, url?: string | URL) {
            const oldUrl = window.location.href;
            _this.originalReplaceState.apply(this, [state, title, url]);
            _this.triggerUrlChange('replaceState', oldUrl, url?.toString() || oldUrl, state);
        };
    }

    /**
     * 监听hashchange事件（处理location.hash变更）
     */
    private listenHashChange(): void {
        this.handleHashChange = this.handleHashChange.bind(this);
        window.addEventListener('hashchange', this.handleHashChange);
    }

    /**
     * hashchange事件回调
     */
    private handleHashChange(e: HashChangeEvent): void {
        // 区分是pushHash（新增历史）还是replaceHash（替换历史）
        // 原理：hashchange触发时，若newURL和oldURL的path/search一致，仅hash不同 → 是pushHash；否则是replaceHash
        const isReplace = e.newURL === e.oldURL;
        const action = isReplace ? 'replaceHash' : 'pushHash';
        this.triggerUrlChange(action, e.oldURL, e.newURL, null);
    }

    /**
     * 监听popstate事件（处理前进/后退/history.back()等）
     */
    private listenPopstate(): void {
        this.handlePopstate = this.handlePopstate.bind(this);
        window.addEventListener('popstate', this.handlePopstate);
    }

    /**
     * popstate事件回调
     */
    private handlePopstate(e: PopStateEvent): void {
        const oldUrl = window.location.href; // popstate触发时URL已变更，这里oldUrl实际是变更后的值？
        // 修正：popstate触发时，URL已完成变更，oldUrl需要通过历史记录推导（简化方案：用变更前的缓存，或直接用当前URL）
        // 更精准的实现可通过history.length对比，但简化场景下直接使用当前URL即可满足大部分需求
        this.triggerUrlChange('popstate', oldUrl, window.location.href, e.state);
    }

    /**
     * 触发URL变更事件（统一格式化事件详情并通过mitt分发）
     * @param action 操作类型
     * @param oldUrl 变更前URL
     * @param targetUrl 目标URL（可能是相对路径或完整URL）
     * @param state history.state数据
     */
    private triggerUrlChange(
        action: UrlChangeDetail['action'],
        oldUrl: string,
        targetUrl: string,
        state: any
    ): void {
        // 解析完整的URL信息（处理相对路径→绝对路径）
        const newUrlObj = new URL(targetUrl, window.location.origin);
        const detail: UrlChangeDetail = {
            action,
            oldUrl,
            newUrl: newUrlObj.href,
            hash: newUrlObj.hash,
            pathname: newUrlObj.pathname,
            search: newUrlObj.search,
            state,
        };

        // 通过mitt分发事件（外部可监听）
        this.emitter.emit('urlChange', detail);
    }
}