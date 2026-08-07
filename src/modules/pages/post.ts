// 帖子页面流程：挂载下载按钮，直接下载当前帖子

import { logger as globalLogger, Optional } from '@/utils/main.js';
import { defineModule } from '../types.js';
import { downloadResource } from '../downloader/main.js';
import type { Site } from '@/sites/types.js';
import { App } from 'vue';
import { i18nKeys } from '@/i18n/utils.js';
import i18n from '@/i18n/main.js';
import { mountDownloadButton } from './mount.js';

const t = i18n.global.t;
const logger = globalLogger.withPath('pages', 'post');

/**
 * 创建帖子页面模块  
 * 站点无关：页面URL解析与API访问来自站点adapter
 * @param site 当前站点adapter
 */
export function createPostPageModule(site: Site) {
    const page = site.pages.post!;

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
