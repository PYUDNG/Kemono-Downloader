import { site } from '@/sites/main.js';
import { createCreatorPageModule } from './pages/creator.js';
import { createPostPageModule } from './pages/post.js';
export * as settings from './settings/main.js';
export * as api from './api/main.js';
export * as downloader from './downloader/main.js';
export * as debugging from './debugging/main.js';
export * as self from './self/main.js';

// 页面模块：由站点adapter驱动（checkers/挂载点/请求解析均来自当前站点）
// 注意：与`export * as`导出的命名空间结构保持一致（{ default: Module }），loader直接消费
export const creator = { default: createCreatorPageModule(site) };
export const post = { default: createPostPageModule(site) };
