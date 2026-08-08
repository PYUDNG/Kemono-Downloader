// 帖子页面流程（Kemono系）：挂载下载按钮，直接下载当前帖子

import { logger as globalLogger, Optional } from '@/utils/main.js';
import { defineModule } from '@/modules/types.js';
import { downloadResource } from '@/modules/downloader/main.js';
import type { Site } from '../../types.js';
import type { PageDefinition } from '../types.js';
import { App } from 'vue';
import { i18nKeys } from '@/i18n/utils.js';
import i18n from '@/i18n/main.js';
import { mountDownloadButton, waitForDetach } from './mount.js';

const t = i18n.global.t;
const logger = globalLogger.withPath('pages', 'post');

/**
 * 帖子页面流程所需的上下文（Kemono系家族依赖 + 通用site）
 */
export interface KemonoPostContext {
    /**
     * 通用site（提供resolve/expand/id）
     */
    site: Site;
    /**
     * 帖子页定义（URL匹配/挂载点/请求解析）
     */
    page: PageDefinition;
}

/**
 * 创建帖子页面模块（Kemono系）  
 * 页面URL解析与下载意图来自上下文
 */
export function createKemonoPostModule({ site, page }: KemonoPostContext) {
    return defineModule({
        id: 'post',
        name: t(i18nKeys.$post.$name),
        checkers: page.checkers,
        // 页面级UI：同类型页面跳转时由loader重新挂载
        remountOnUrlChange: true,
        readyState: 'interactive',
        async enter() {
            // 记录本次挂载代次：若挂载等待期间发生leave（页面再次跳转），放弃本次挂载
            const generation = this.context!.generation;
            // 同类型跳转重新挂载：宿主SPA尚未重渲染，旧挂载点可能仍在文档中；先等它被替换，避免挂进即将被丢弃的旧元素
            this.context!.mountTarget && await waitForDetach(this.context!.mountTarget);
            // 挂载下载按钮
            const { container, app, mountTarget } = await mountDownloadButton(page.mount, {
                loading: false,
                label: t(i18nKeys.$post.$gui.$download),
                onClick(_e) {
                    try {
                        const request = page.parseRequest(location.pathname);
                        if (!request) return;

                        // 解析为资源并下载
                        const resource = site.resolve(request);
                        downloadResource(resource, site.expand, site.id);
                    } catch (err) {
                        // 出现错误，测试中多半为API网络错误
                        logger.simple('Error', 'Error in downloadButton.onclick');
                        logger.asLevel('Error', err);
                    }
                },
            });
            // 挂载期间发生了leave（页面又跳转）：放弃本次挂载
            if (this.context!.generation !== generation) {
                app.unmount();
                container.remove();
                return;
            }
            this.context!.container = container;
            this.context!.app = app;
            this.context!.mountTarget = mountTarget;
        },
        leave() {
            // 自增代次，使挂载中（await）的enter失效
            this.context!.generation++;
            this.context!.app?.unmount();
            this.context!.container?.remove();
            this.context!.container = undefined;
            this.context!.app = undefined;
        },
        context: {
            container: undefined as Optional<HTMLElement>,
            app: undefined as Optional<App>,
            /** 上次挂载点元素（leave时不清理，供下次enter等待其被SPA替换） */
            mountTarget: undefined as Optional<HTMLElement>,
            /** 挂载代次：leave时自增，用于取消等待中的enter挂载 */
            generation: 0,
        },
    });
}
