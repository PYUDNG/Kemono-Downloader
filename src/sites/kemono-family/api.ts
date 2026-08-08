import { apiRequest, isErrorResponse } from '@/modules/api/main.js';
import type { APIErrorResponse } from '@/modules/api/types/common.js';
import type { PostApiResponse } from '@/modules/api/types/post.js';
import type { SiteApi } from './types.js';

/**
 * Kemono系站点的API实现工厂  
 * 端点路径与错误格式相同，仅响应结构可能不同（如pawchive的post详情为扁平结构）
 * @param normalizePost 响应归一化函数；返回canonical `PostApiResponse` 或原样错误响应
 */
export function createPostsApi(
    normalizePost?: (raw: any) => PostApiResponse | APIErrorResponse,
): SiteApi {
    return {
        async profile({ service, creatorId }) {
            return apiRequest({
                method: 'GET',
                url: `https://${ location.host }/api/v1/${ service }/user/${ creatorId }/profile`,
            });
        },

        async posts({ service, creatorId, index, query }) {
            const url = new URL(`https://${ location.host }/api/v1/${ service }/user/${ creatorId }/posts`);
            typeof index === 'number' && url.searchParams.set('o', index.toString());
            typeof query === 'string' && url.searchParams.set('q', query);
            return apiRequest({
                method: 'GET',
                url: url.href,
            });
        },

        async post(info) {
            const data = await apiRequest({
                method: 'GET',
                url: `https://${ location.host }/api/v1/${ info.service }/user/${ info.creatorId }/post/${ info.postId }`,
            });
            return normalizePost ? normalizePost(data) : data;
        },

        isErrorResponse,
    };
}
