import type { Site } from './types.js';
import { kemono } from './kemono.js';

/**
 * 全部已实现的站点 adapter
 */
const sites: Site[] = [
    kemono,
];

/**
 * 根据域名识别当前站点  
 * 未命中时回退到第一个站点（保持向后兼容）
 * @param hostname 当前页面域名
 */
export function detectSite(hostname: string): Site {
    return sites.find(site => site.hosts.some(host =>
        hostname === host || hostname.endsWith('.' + host)
    )) ?? sites[0];
}

/**
 * 当前站点（脚本运行于单个域名，模块加载时即可确定）
 */
export const site = detectSite(location.hostname);
