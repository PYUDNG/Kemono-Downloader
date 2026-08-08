import { logger as globalLogger, testChecker, URLChangeMonitor } from '@/utils/main';
import { modules } from '@/modules/main.js';
import { decideModuleActions } from './loader-actions.js';
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

/**
 * 各模块上次生效时的URL（用于同类型页面跳转的重新挂载判定）
 */
const lastUrl: Record<string, string> = {};

const monitor = new URLChangeMonitor();
monitor.init();
monitor.onUrlChange(onUrlChange, true);

/**
 * 页面URL改变回调  
 * 为每个module重新判定并记录激活状态，触发生命周期钩子
 */
async function onUrlChange() {
    for (const module of Object.values(modules)) {
        const id = module.default.id;
        /** 新url下，此页面是否激活 */
        const moduleActive = !Object.hasOwn(module.default, 'checkers') || testChecker(module.default.checkers!, module.default.mode ?? 'and');

        // 判定本模块应执行的动作（进入/离开/重新挂载）
        const actions = decideModuleActions(
            activeState[id],
            moduleActive,
            lastUrl[id] !== location.href,
            !!module.default.remountOnUrlChange,
        );
        for (const action of actions) {
            if (action === 'enter') {
                logger.simple('Detail', `loader: enter ${ id }`);
                module.default.enter?.();
                module.default.toggle?.();
            } else if (action === 'leave') {
                logger.simple('Detail', `loader: leave ${ id }`);
                module.default.leave?.();
                module.default.toggle?.();
            } else if (action === 'remount') {
                // 同类型页面跳转：先卸旧页面功能，再挂新页面功能
                logger.simple('Detail', `loader: remount ${ id }`);
                module.default.leave?.();
                module.default.toggle?.();
                module.default.enter?.();
                module.default.toggle?.();
            }
        }

        // 记录激活状态与生效URL
        activeState[id] = moduleActive;
        lastUrl[id] = location.href;
    }
}
