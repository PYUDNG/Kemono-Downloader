// 此文件会在脚本执行之初加载，处于页面早期加载阶段，可以用来执行一些早于页面代码的任务
// dev环境下由于vite动态加载脚本的特性，一定会有延迟，因此依赖此处的代码可以考虑使用prod版本调试

// 注：Kemono网站目前并不需要console fetch addEventListener这三个hook，但是已有代码暂时不删除，以备后续需要
export const console: {
    [K in keyof Console]: Console[K]
} = Object.assign(Object.create(null), window.console);

export const fetch = window.fetch;

export const addEventListener = EventTarget.prototype.addEventListener;
