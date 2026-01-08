import { addEventListener } from "./hooks.js";
import { detectDom, UserscriptStyling } from "./utils/main.js";
import './style.css';

export const styling = new UserscriptStyling();

// 初始化直接加载的样式CSS代码
const load = () => {
    const loadStyleElement = (() => {
        const index: Record<string, number> = {};
        return loadStyleElement;

        /**
         * 将页面中的<style>元素转为{@link styling}所管理的CSS代码
         * @param style <style>元素
         * @param name 该<style>元素的类别名称，用作{@link styling}中css存储key的一部分（无实际功能性影响）
         */
        function loadStyleElement(style: HTMLStyleElement, name: string) {
            const i = Object.hasOwn(index, name) ? index[name]++ : (index[name] = 0);
            styling.setStyle(`__${name}[${i}]__`, style.innerHTML);
            style.remove();
        }
    }) ();

    // 代码中import语句引入的CSS
    if (import.meta.env.PROD) {
        // 生产环境下，css会通过vite-plugin-monkey的cssSideEffects选项的
        // 自定义逻辑暂存在window._importedStyles变量
        const importedStyles = (window as any)._importedStyles as string[];
        importedStyles.forEach((css, i) => styling.setStyle(`__imported[${i}]__`, css));
    } else {
        // 开发环境下，css会被vite自动作为<style>元素添加到文档
        detectDom({
            selector: 'style[data-vite-dev-id]',
            callback: (style: HTMLStyleElement) => loadStyleElement(style, 'imported'),
        });
    }

    // 其余PrimeVue注入的CSS
    detectDom({
        selector: 'style[data-primevue-style-id]',
        callback: (style: HTMLStyleElement) => loadStyleElement(style, 'prime_vue'),
    });
};
document.readyState === 'loading' ?
    addEventListener.call(document, 'DOMContentLoaded', load, { once: true }) :
    load();
