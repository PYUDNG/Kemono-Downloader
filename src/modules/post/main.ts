// https://kemono.cr/fanbox/user/8062849/post/9998726

import { $CrE, detectDom, Optional } from '@/utils/main.js';
import { defineModule } from '../types.js';
import { downloadPost } from '../downloader/main.js';
import { KemonoService } from '../api/types/common.js';

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
                const match = location.pathname.match(regPath)!;
                downloadPost({
                    service: match[1] as KemonoService,
                    creatorId: match[2],
                    postId: match[3],
                });
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