import type { App } from 'vue';
import { $CrE, createShadowApp, detectDom } from '@/utils/main.js';
import type { ComponentProps } from 'vue-component-type-helpers';
import DownloadButton from '@/components/DownloadButton.vue';
import type { MountConfig } from '../types.js';

/**
 * 等待元素从文档中移除（宿主SPA重渲染会替换旧页面DOM）  
 * 元素已不在文档中或超时后resolve
 * @param el 目标元素
 * @param timeoutMs 超时时间（默认1s）；超时后不再等待（避免SPA复用元素时永久挂起）
 */
export function waitForDetach(el: HTMLElement, timeoutMs: number = 1000): Promise<void> {
    if (!el.isConnected) return Promise.resolve();
    return new Promise(resolve => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            observer.disconnect();
            resolve();
        };
        const timer = setTimeout(finish, timeoutMs);
        const observer = new MutationObserver(() => {
            !el.isConnected && finish();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

/**
 * 挂载下载按钮到宿主页面  
 * 根据挂载配置等待挂载点元素、创建容器并挂载Shadow App
 * @param mount 挂载配置
 * @param props DownloadButton的props（含点击回调等）
 * @returns 容器元素、App实例、根组件实例与挂载点元素
 */
export async function mountDownloadButton(
    mount: MountConfig,
    props: ComponentProps<typeof DownloadButton>,
): Promise<{ container: HTMLElement; app: App; root: InstanceType<typeof DownloadButton>; mountTarget: HTMLElement }> {
    // 等待挂载点元素出现
    const mountTarget = await detectDom(mount.containerSelector) as HTMLElement;

    // 创建按钮容器
    const container = $CrE('span', {
        styles: mount.containerStyles ?? {},
        classes: mount.containerClasses ?? '',
    });

    // 插入到指定位置
    if (mount.insert && typeof mount.insert === 'object' && mount.insert.before) {
        const anchor = await detectDom(mount.insert.before) as HTMLElement;
        anchor.before(container);
    } else {
        mountTarget.appendChild(container);
    }

    // 挂载按钮到容器的 Shadow DOM 内
    const { host, app, root } = createShadowApp(DownloadButton, {
        host: container,
        options: {
            app: {
                classes: mount.appClasses ?? [],
            }
        },
        props,
    });

    return { container: host, app, root, mountTarget };
}
