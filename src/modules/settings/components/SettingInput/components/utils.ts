import { logger as globalLogger } from "@/utils/main";

const logger = globalLogger.withPath('settings', 'components');

// For non-zhCN maintainers: This is an easter egg that actually does nothing more than a console log
export function eggExpectedModification() {
    logger.simple('Info', '哪个好奇宝宝一定要改一下这个设置来着，原来是你\n在这里修改无效哦~');
}