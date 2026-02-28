// https://kemono.cr/fanbox/user/8062849/post/9998726

import { $CrE, detectDom, Optional, logger as globalLogger } from '@/utils/main.js';
import { defineModule } from '../types.js';
import { downloadPost } from '../downloader/main.js';
import { KemonoService } from '../api/types/common.js';

const logger = globalLogger.withPath('post');
const regPath = /^\/(boosty|dlsite|fanbox|fantia|gumroad|patreon|subscribestar)\/user\/([^\/]+)\/post\/([^\/]+)$/;

export default defineModule({
    id: 'post',
    name: '帖子页面',
    checkers: [{
        type: 'regpath',
        value: regPath
    }],
    readyState: 'interactive',
    async enter() {
        /**
         * 是否已在下载中  
         * 用于防止重复下载
         */
        let loading = false;

        const divActions = await detectDom('.post__actions') as HTMLDivElement;
        this.context!.downloadButton = divActions.appendChild($CrE('span', {
            props: {
                innerText: '下载',
            },
            styles: {
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
            },
            classes: 'button',
            listeners: [['click', _e => {
                if (loading) return;
                loading = true;

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
                } finally {
                    // 即使出现错误，也保证按钮恢复成可点击状态
                    loading = false;
                }
            }]]
        }));
    },
    leave() {
        this.context!.downloadButton?.remove();
    },
    context: {
        downloadButton: undefined as Optional<HTMLSpanElement>,
    },
});