// https://kemono.cr/fanbox/user/8062849

import { $CrE, createShadowApp, detectDom, logger as globalLogger, Nullable, Optional, toast } from '@/utils/main.js';
import { defineModule } from '../types.js';
import { downloadPosts } from '../downloader/main.js';
import PostsDialog from '@/components/PostsSelector/PostsDialog.vue';
import DownloadButton from '@/components/DownloadButton.vue';
import { isErrorResponse, posts, profile } from '../api/main.js';
import { KemonoService, PostInfo } from '../api/types/common.js';
import { App, reactive, watch } from 'vue';
import { ComponentProps } from 'vue-component-type-helpers';
import i18n, { i18nKeys } from '@/i18n/main.js';
import { PostsApiItem } from '../api/types/posts.js';
import { ToastMessageOptions } from 'primevue';
import PrimeDownload from '~icons/prime/download';
import PrimeTimes from '~icons/prime/times';

const t = i18n.global.t;
const $creator = i18nKeys.$creator;
const logger = globalLogger.withPath('creator');
const regPath = /^\/(boosty|dlsite|fanbox|fantia|gumroad|patreon|subscribestar)\/user\/([^/]+)$/;

export default defineModule({
    id: 'creator',
    name: t($creator.$name),
    checkers: [{
        type: 'regpath',
        value: regPath
    }],
    readyState: 'interactive',
    async enter() {
        // 在操作栏中创建按钮的容器
        const divActions = await detectDom('.user-header__actions') as HTMLDivElement;
        const container = this.context!.container = divActions.appendChild($CrE('span', {
            styles: {
                background: 'transparent',
                border: 'none',
                color: 'white',
                width: 'fit-content',
                height: 'fit-content',
                display: 'block',
                padding: '0',
            },
            classes: 'button',
        }));

        // 挂载按钮到容器的 Shadow DOM 内
        const { app } = createShadowApp(DownloadButton, {
            host: container,
            options: {
                app: {
                    classes: ['w-fit'],
                }
            },
            props: {
                loading: false,
                label: t($creator.$gui.$download),
                async onClick(_e) {
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
                        ]);
                        if (isErrorResponse(creator)) throw new Error(creator.error);
                        if (isErrorResponse(allPosts)) throw new Error(allPosts.error);
                        props.header = t($creator.$gui.$postsSelector.$header);
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

/**
 * 存储当前用户输入的筛选文本  
 * 以方便在翻页时使用同样的筛选文本访问api
 */
let search: string | undefined = undefined;
// 注：页码不需要存，因为筛选文本改变时页码会自动复原到第一页（PostList内部实现如此）

/**
 * 传入PostsDialog根组件的属性
 */
const props: ComponentProps<typeof PostsDialog> = reactive({
    header: '',
    posts: [],
    rows: 50,
    total: 0,
    mode: 'remote',
    buttons: [{
        type: 'secondary',
        label: t($creator.$gui.$postsSelector.$buttons.$cancel),
        disabled: false,
        icon: PrimeTimes,
        onclick(_submit, cancel) {
            cancel();
        },
    }, {
        type: 'primary',
        label: t($creator.$gui.$postsSelector.$buttons.$download),
        disabled: true,
        icon: PrimeDownload,
        onclick(submit, _cancel) {
            submit();
        },
    }],
    async onPageUpdate(page) {
        const match = location.pathname.match(regPath)!;
        const allPosts = await posts({
            service: match[1] as KemonoService,
            creatorId: match[2],
            index: page.first,
            query: search,
        });
        if (isErrorResponse(allPosts)) throw new Error(allPosts.error);
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
        if (isErrorResponse(allPosts)) throw new Error(allPosts.error);
        props.posts.splice(0, props.posts.length, ...allPosts);
    },
    async onSelectAll(_e) {
        // 展示加载中Toast
        const message: ToastMessageOptions = {
            closable: false,
            summary: t($creator.$gui.$selectAllPages.$summary),
            detail: t($creator.$gui.$selectAllPages.$detail),
            severity: 'info',
        };
        toast.add(message);

        // 加载全部页数据
        const match = location.pathname.match(regPath)!;
        const allPosts: PostsApiItem[] = [];
        for (let i = 0; ; i += 50) {
            const page = await posts({
                service: match[1] as KemonoService,
                creatorId: match[2],
                index: i,
                query: search,
            });
            if (isErrorResponse(page) || page.length === 0) break;
            allPosts.push(...page);
        }
        
        // 全部选中
        const infos = allPosts.map(post => ({
            service: post.service,
            creatorId: post.user,
            postId: post.id,
        }));
        root.selectedPosts.splice(
            0,
            root.selectedPosts.length,
            ...infos
        );

        // 移除加载中Toast
        toast.remove(message);
    },
})
const { root } = createShadowApp(PostsDialog, {
    options: {
        app: {
            classes: 'dark'
        }
    },
    props: props,
});

// 帖子选择器：当选中数量为0时禁用提交按钮
watch(() => root.selectedPosts.length, length => props.buttons![1].disabled = length === 0);
