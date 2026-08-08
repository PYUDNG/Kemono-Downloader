import { testChecker } from '@/utils/main.js';
import type { Site } from './types.js';
import { kemono } from './kemono.js';
import { pawchive } from './pawchive.js';

/**
 * 全部已实现的站点 adapter
 */
const sites: Site[] = [
    kemono,
    pawchive,
];

/**
 * 根据当前页面域名判断命中哪个站点 adapter  
 * 命中规则由各站点自行声明（`site.hosts`，复用checker机制）  
 * 未命中返回`null`（不加载任何站点模块）
 */
export function detectSite(): Site | null {
    return sites.find(site => testChecker(site.hosts)) ?? null;
}

/**
 * 当前站点（脚本运行于单个域名，模块加载时即可确定；未命中时为`null`）
 */
export const site = detectSite();
