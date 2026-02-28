// https://kemono.cr/fanbox/user/8062849

import { $CrE, createShadowApp, detectDom, logger as globalLogger, Nullable, Optional } from '@/utils/main.js';
import { defineModule } from '../types.js';
import { downloadPosts } from '../downloader/main.js';
import App from '@/components/PostsSelector/PostsDialog.vue';
import { posts, profile } from '../api/main.js';
import { KemonoService, PostInfo } from '../api/types/common.js';
import { reactive } from 'vue';
import { ComponentProps } from 'vue-component-type-helpers';
import i18n from '@/i18n/main.js';

const t = i18n.global.t;
const logger = globalLogger.withPath('creator');
const regPath = /^\/(boosty|dlsite|fanbox|fantia|gumroad|patreon|subscribestar)\/user\/([^\/]+)$/;

/**
 * 是否处于 用户点击了下载按钮，且下载尚未完成、也未中断的 运行中状态
 */
let loading = false;

export default defineModule({
    id: 'creator',
    name: '创作者页面',
    checkers: [{
        type: 'regpath',
        value: regPath
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
            listeners: [['click', async _e => {
                if (loading) return;
                loading = true;

                try {
                    const match = location.pathname.match(regPath)!;
                    const [creator, allPosts] = await Promise.all([
                        await profile({
                            service: match[1] as KemonoService,
                            creatorId: match[2]
                        }),
                        await posts({
                            service: match[1] as KemonoService,
                            creatorId: match[2]
                        }),
                    ])
                    props.header = t('creator.gui.posts-selector.header');
                    props.posts = allPosts;
                    props.total = creator.post_count;
                    props.selectedPosts = [];

                    const infos = await root.show().catch(() => null) as Nullable<PostInfo[]>;

                    if (infos) {
                        // 用户选择了需要下载的Posts
                        downloadPosts(creator.name, infos);
                    } else {
                        // 用户直接关闭了选择窗口
                        // 什么都不做
                    }
                } catch(err) {
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

/**
 * 存储当前用户输入的筛选文本  
 * 以方便在翻页时使用同样的筛选文本访问api
 */
let search: string | undefined = undefined;
// 注：页码不需要存，因为筛选文本改变时页码会自动复原到第一页（PostList内部实现如此）

/**
 * 传入PostsDialog根组件的属性
 */
const props: ComponentProps<typeof App> = reactive({
    header: '',
    posts: [],
    rows: 50,
    total: 0,
    mode: 'remote',
    async onPageUpdate(page) {
        const match = location.pathname.match(regPath)!;
        const allPosts = await posts({
            service: match[1] as KemonoService,
            creatorId: match[2],
            index: page.first,
            query: search,
        });
        props.posts.splice(0, props.posts.length, ...allPosts);
    },
    async onFilter(keyword) {
        search = keyword;
        const match = location.pathname.match(regPath)!;
        const allPosts = await posts({
            service: match[1] as KemonoService,
            creatorId: match[2],
            query: keyword,
        });
        props.posts.splice(0, props.posts.length, ...allPosts);
    },
})
const { root } = createShadowApp(App, {
    options: {
        app: {
            classes: 'dark'
        }
    },
    props: props,
});
