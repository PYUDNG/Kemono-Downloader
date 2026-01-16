import { requestJson } from "@/utils/main.js";
import { PostApiResponse } from "./types/post.js";
import { defineModule } from "../types.js";
import { KemonoService } from "./types/common.js";
import { GmXmlhttpRequestOption } from "$";

/**
 * 发送api请求到Kemono服务器
 */
export function api<
    C = undefined
>(options: GmXmlhttpRequestOption<'text', C>) {
    // Kemono的API要求headers标明Accept:text/css
    const headers = { Accept: 'text/css' };
    options.headers = typeof options.headers === 'object' ?
        Object.assign(headers, options.headers) : headers;
    return requestJson(options);
}

/**
 * 获取post信息
 */
export function post(
    service: KemonoService,
    userId: string,
    postId: string,
): Promise<PostApiResponse> {
    return api({
        method: 'GET',
        url: `https://kemono.cr/api/v1/${ service }/user/${ userId }/post/${ postId }`,
    });
}

// 默认导出模块定义
export default defineModule({
    id: 'api',
    name: 'Kemono API',
});