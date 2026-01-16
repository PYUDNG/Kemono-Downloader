import { logger as globalLogger, testChecker, URLChangeMonitor } from '@/utils/main';
import * as modules from '@/modules/main.js';
export { modules };

const logger = globalLogger.withPath('loader');

/**
 * 存储所有modules的激活情况
 */
export const activeState: Record<string, boolean> = Object.values(modules).reduce(
    (state, module) => {
        state[module.default.id] = false;
        return state;
    },
    {} as typeof activeState
);

const monitor = new URLChangeMonitor();
monitor.init();
monitor.onUrlChange(onUrlChange, true);

/**
 * 页面URL改变回调  
 * 为每个module重新判定并记录激活状态，触发生命周期钩子
 */
async function onUrlChange() {
    for (const module of Object.values(modules)) {
        /** 新url下，此页面是否激活 */
        const moduleActive = !Object.hasOwn(module.default, 'checkers') || testChecker(module.default.checkers!, module.default.mode ?? 'and');

        // 进入页面
        if (!activeState[module.default.id] && moduleActive) {
            logger.simple('Detail', `loader: enter ${ module.default.id }`);
            module.default.enter?.();
            module.default.toggle?.();
        }

        // 离开页面
        if (activeState[module.default.id] && !moduleActive) {
            logger.simple('Detail', `loader: leave ${ module.default.id }`);
            module.default.leave?.();
            module.default.toggle?.();
        }

        // 记录激活状态
        activeState[module.default.id] = moduleActive;
    }
}