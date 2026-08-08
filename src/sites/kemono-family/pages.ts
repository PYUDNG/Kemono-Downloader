import type { PageDefinition, PageType } from './types.js';

// Kemono系站点的页面URL结构（创作者页 / 帖子页路径一致）
const creatorRegPath = /^\/(boosty|dlsite|fanbox|fantia|gumroad|patreon|subscribestar)\/user\/([^/]+)$/;
const postRegPath = /^\/(boosty|dlsite|fanbox|fantia|gumroad|patreon|subscribestar)\/user\/([^/]+)\/post\/([^/]+)$/;

/**
 * Kemono系站点的页面定义工厂  
 * 页面URL结构与挂载点（`.user-header__actions` / `.post__actions`）在Kemono系站点间一致
 */
export function createKemonoStylePages(): Partial<Record<PageType, PageDefinition>> {
    return {
        creator: {
            checkers: [{
                type: 'regpath',
                value: creatorRegPath,
            }],
            mount: {
                containerSelector: '.user-header__actions',
                containerStyles: {
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    width: 'fit-content',
                    height: 'fit-content',
                    display: 'block',
                    padding: '0',
                },
                containerClasses: 'button',
                appClasses: ['w-fit'],
            },
            parseRequest(pathname) {
                const match = pathname.match(creatorRegPath);
                return match ? {
                    kind: 'creator',
                    service: match[1],
                    creatorId: match[2],
                } : null;
            },
        },
        post: {
            checkers: [{
                type: 'regpath',
                value: postRegPath,
            }],
            mount: {
                containerSelector: '.post__actions',
                containerStyles: {
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    width: 'fit-content',
                    height: 'fit-content',
                    display: 'block',
                },
                containerClasses: 'button',
                appClasses: ['w-fit'],
            },
            parseRequest(pathname) {
                const match = pathname.match(postRegPath);
                return match ? {
                    kind: 'post',
                    service: match[1],
                    creatorId: match[2],
                    postId: match[3],
                } : null;
            },
        },
    };
}
