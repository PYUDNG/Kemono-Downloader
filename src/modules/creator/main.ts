// https://kemono.cr/fanbox/user/8062849

import { $CrE, detectDom, logger as globalLogger, Optional } from '@/utils/main.js';
import { defineModule } from '../types.js';
import {  } from '../downloader/main.js';

const logger = globalLogger.withPath('creator');

export default defineModule({
    id: 'creator',
    name: '创作者页面',
    checkers: [{
        type: 'regpath',
        value: /^\/(boosty|dlsite|fanbox|fantia|gumroad|patreon|subscribestar)\/user\/[^\/]+$/
    }],
    readyState: 'interactive',
    async enter() {
        const divActions = await detectDom('.user-header__actions') as HTMLDivElement;
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
            listeners: [['click', _e => {
                logger.simple('Important', 'Start downloading');
                //
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