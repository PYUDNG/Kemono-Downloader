// 帖子页面流程（Kemono系）：挂载下载按钮，直接下载当前帖子

import { logger as globalLogger, Optional } from '@/utils/main.js';
import { defineModule } from '@/modules/types.js';
import { downloadResource } from '@/modules/downloader/main.js';
import type { Site } from '../../types.js';
import type { PageDefinition } from '../types.js';
import { App } from 'vue';
import { i18nKeys } from '@/i18n/utils.js';
import i18n from '@/i18n/main.js';
import { mountDownloadButton } from './mount.js';

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
        readyState: 'interactive',
        async enter() {
            // 挂载下载按钮
            const { container, app } = await mountDownloadButton(page.mount, {
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
            this.context!.container = container;
            this.context!.app = app;
        },
        leave() {
            this.context!.app?.unmount();
            this.context!.container?.remove();
        },
        context: {
            container: undefined as Optional<HTMLElement>,
            app: undefined as Optional<App>,
        },
    });
}
