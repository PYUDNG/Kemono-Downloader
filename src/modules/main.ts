import { site } from '@/sites/main.js';
import type { Module } from './types.js';
import * as settings from './settings/main.js';
import * as api from './api/main.js';
import * as downloader from './downloader/main.js';
import * as debugging from './debugging/main.js';
import * as self from './self/main.js';

// 站点声明的页面模块：包装成 { default: Module } 形状后并入
const siteModules: Record<string, { default: Module<unknown> }> = {};
if (site) {
    for (const [id, factory] of Object.entries(site.modules)) {
        siteModules[id] = { default: factory(site) };
    }
}

/**
 * 全部模块：脚本原生模块 + 当前站点声明的模块  
 * 注：站点模块的key/id不应与原生模块（settings/api/downloader/debugging/self）冲突
 */
export const modules = {
    settings,
    api,
    downloader,
    debugging,
    self,
    ...siteModules,
};
