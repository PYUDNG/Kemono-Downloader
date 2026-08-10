// 外观模块置于首位：其模块体执行时即根据设置初始化界面语言/深色模式/主题色状态，
// 保证后续模块的静态t()调用（defineModule名/菜单命令等）使用用户所选语言
import * as appearance from './appearance/main.js';
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
 * 注：站点模块的key/id不应与原生模块（appearance/settings/api/downloader/debugging/self）冲突
 */
export const modules = {
    appearance,
    settings,
    api,
    downloader,
    debugging,
    self,
    ...siteModules,
};
