// 创作者页面流程：挂载下载按钮，弹出帖子选择器，下载所选帖子

import { createShadowApp, logger as globalLogger, Nullable, Optional, toast } from '@/utils/main.js';
import { defineModule } from '../types.js';
import { downloadResource } from '../downloader/main.js';
import PostsDialog from '@/components/PostsSelector/PostsDialog.vue';
import { isErrorResponse } from '../api/main.js';
import type { Site, DownloadRequest } from '@/sites/types.js';
import type { PostInfo } from '../api/types/common.js';
import { App, reactive, watch } from 'vue';
import { ComponentProps } from 'vue-component-type-helpers';
import i18n, { i18nKeys } from '@/i18n/main.js';
import type { PostsApiItem } from '../api/types/posts.js';
import { ToastMessageOptions } from 'primevue';
import PrimeDownload from '~icons/prime/download';
import PrimeTimes from '~icons/prime/times';
import { mountDownloadButton } from './mount.js';

const t = i18n.global.t;
const $creator = i18nKeys.$creator;
const logger = globalLogger.withPath('pages', 'creator');

/**
 * 创建创作者页面模块  
 * 站点无关：页面URL解析、API访问、能力差异全部来自站点adapter
 * @param site 当前站点adapter
 */
export function createCreatorPageModule(site: Site) {
    const page = site.pages.creator!;

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
            const allPosts = await site.api.posts({
                ...currentRequest()!,
                index: page.first,
                query: search,
            });
            if (isErrorResponse(allPosts)) throw new Error(allPosts.error);
            props.posts.splice(0, props.posts.length, ...allPosts);
        },
        async onFilter(keyword) {
            // 站点能力：搜索关键字最小长度（如pawchive要求至少3字符）
            if (keyword.length < site.capabilities.searchMinLength) return;
            search = keyword;
            const allPosts = await site.api.posts({
                ...currentRequest()!,
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
            const allPosts: PostsApiItem[] = [];
            for (let i = 0; ; i += 50) {
                const page = await site.api.posts({
                    ...currentRequest()!,
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

    /**
     * 从当前页面路径解析创作者请求（供对话框分页/筛选使用）
     */
    function currentRequest(): Extract<DownloadRequest, { kind: 'creator' }> | null {
        const request = page.parseRequest(location.pathname);
        if (!request || request.kind !== 'creator') return null;
        return request as Extract<DownloadRequest, { kind: 'creator' }>;
    }

    return defineModule({
        id: 'creator',
        name: t($creator.$name),
        checkers: page.checkers,
        readyState: 'interactive',
        async enter() {
            // 挂载下载按钮
            const { container, app } = await mountDownloadButton(page.mount, {
                loading: false,
                label: t($creator.$gui.$download),
                async onClick(_e) {
                    try {
                        const request = currentRequest();
                        if (!request) return;

                        const [creator, allPosts] = await Promise.all([
                            site.api.profile({
                                service: request.service,
                                creatorId: request.creatorId,
                            }),
                            site.api.posts({
                                service: request.service,
                                creatorId: request.creatorId,
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
                            const resource = site.resolve({
                                kind: 'batch',
                                name: creator.name,
                                requests: infos.map(info => ({
                                    kind: 'post',
                                    service: info.service,
                                    creatorId: info.creatorId,
                                    postId: info.postId,
                                })),
                            });
                            downloadResource(resource, site.expand, site.id);
                        } else {
                            // 用户直接关闭了选择窗口
                            // 什么都不做
                        }
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
