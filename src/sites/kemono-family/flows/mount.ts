import type { App } from 'vue';
import { $CrE, createShadowApp, detectDom } from '@/utils/main.js';
import type { ComponentProps } from 'vue-component-type-helpers';
import DownloadButton from '@/components/DownloadButton.vue';
import type { MountConfig } from '../types.js';

/**
 * 挂载下载按钮到宿主页面  
 * 根据挂载配置等待挂载点元素、创建容器并挂载Shadow App
 * @param mount 挂载配置
 * @param props DownloadButton的props（含点击回调等）
 * @returns 容器元素、App实例与根组件实例
 */
export async function mountDownloadButton(
    mount: MountConfig,
    props: ComponentProps<typeof DownloadButton>,
): Promise<{ container: HTMLElement; app: App; root: InstanceType<typeof DownloadButton> }> {
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

    return { container: host, app, root };
}
