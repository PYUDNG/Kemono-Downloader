// https://kemono.cr/fanbox/user/8062849/post/9998726

import { $CrE, detectDom, Optional, logger as globalLogger, createShadowApp } from '@/utils/main.js';
import { defineModule } from '../types.js';
import { downloadPost } from '../downloader/main.js';
import { KemonoService } from '../api/types/common.js';
import { i18nKeys } from '@/i18n/utils.js';
import DownloadButton from '@/components/DownloadButton.vue';
import i18n from '@/i18n/main.js';
import { App } from 'vue';

const t = i18n.global.t;
const logger = globalLogger.withPath('post');
const regPath = /^\/(boosty|dlsite|fanbox|fantia|gumroad|patreon|subscribestar)\/user\/([^\/]+)\/post\/([^\/]+)$/;

export default defineModule({
    id: 'post',
    name: t(i18nKeys.$post.$name),
    checkers: [{
        type: 'regpath',
        value: regPath
    }],
    readyState: 'interactive',
    async enter() {
        // 在操作栏中创建按钮的容器
        const divActions = await detectDom('.post__actions') as HTMLDivElement;
        const container = this.context!.container = divActions.appendChild($CrE('span', {
            styles: {
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
            },
            classes: 'button',
        }));

        // 挂载按钮到容器的 Shadow DOM 内
        const { app } = createShadowApp(DownloadButton, {
            host: container,
            props: {
                loading: false,
                label: t(i18nKeys.$post.$gui.$download),
                onClick(_e) {
                    try {
                        const match = location.pathname.match(regPath)!;
                        downloadPost({
                            service: match[1] as KemonoService,
                            creatorId: match[2],
                            postId: match[3],
                        });
                    } catch (err) {
                        // 出现错误，测试中多半为API网络错误
                        logger.simple('Error', 'Error in downloadButton.onclick');
                        logger.asLevel('Error', err);
                    }
                },
            },
        });
        this.context!.app = app;
    },
    leave() {
        this.context!.app?.unmount();
        this.context!.container?.remove();
    },
    context: {
        container: undefined as Optional<HTMLSpanElement>,
        app: undefined as Optional<App>,
    },
});