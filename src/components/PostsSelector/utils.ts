import { PostApiResponse } from "@/modules/api/types/post";
import { PostsApiItem } from "@/modules/api/types/posts";
import { PostInfo } from "@/modules/api/types/common";

/**
 * 根据预览图（preview）的数据，为给定path文件资源寻找对应的server domain  
 * 此函数仅限传入data为{@link PostApiResponse}时使用  
 * {@link PostsApiItem}数据中没有server信息，path只能合成缩略图url而无法合成准确的原始资源url
 * @param path {@link FileItem} 或 {@link Attachment} 的 `path`
 */
export const getAssetServer = (data: PostApiResponse, path: string): string => {
    return data.previews.find(p => p.path === path)?.server ?? `n1.${ location.host }`;
};

export function isPostsApiItem(data: PostsApiItem | PostApiResponse): data is PostsApiItem {
    return Object.hasOwn(data, 'id');
}
export function isPostApiResponse(data: PostsApiItem | PostApiResponse): data is PostApiResponse {
    return Object.hasOwn(data, 'post');
}

/**
 * 从PostsApiItem或PostApiResponse中提取PostInfo
 */
export function extractPostInfo(data: PostsApiItem | PostApiResponse): PostInfo {
    const obj = isPostsApiItem(data) ? data : data.post;
    return {
        service: obj.service,
        creatorId: obj.user,
        postId: obj.id
    };
}

/**
 * 获取帖子标题
 */
export function getPostTitle(data: PostsApiItem | PostApiResponse): string {
    return isPostsApiItem(data) ? data.title : data.post.title;
}

/**
 * 获取帖子内容（用于提取文本）
 */
export function getPostContent(data: PostsApiItem | PostApiResponse): string | undefined {
    return isPostApiResponse(data) ? data.post.content : data.substring;
}

/**
 * 获取帖子文件路径
 */
export function getPostFilePath(data: PostsApiItem | PostApiResponse): string | undefined {
    return isPostsApiItem(data) ? data.file.path : data.post.file.path;
}
