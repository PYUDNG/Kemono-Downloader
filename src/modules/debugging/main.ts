import i18n, { i18nKeys } from "@/i18n/main";
import { defineModule } from "../types";
import { registerModule } from "../settings/main";
import { globalStorage, makeStorageRef } from "@/storage";
import FileEditIcon from '~icons/prime/file-edit'
import FileExportIcon from '~icons/prime/file-export'
import { ref } from "vue";
import { logger as globalLogger, LogItem, safeSerialize, saveAs, stringifyBytes, toast } from "@/utils/main";
import { GM_info } from "$";

const t = i18n.global.t;
const $debugging = i18nKeys.$debugging;
const $settings = $debugging.$settings;
const storage = globalStorage.withKeys('debugging');
const logger = globalLogger.withPath('debugging');

export default defineModule({
    id: 'debugger',
    name: t($debugging.$name),
});

/**
 * 最多保存几个页面的日志
 */
const MAX_LOG_PAGES = 3;
/**
 * 每个页面最多保存几条日志
 */
const MAX_LOG_ITEMS = 20;
const saveLogs = makeStorageRef('saveLogs', storage);

registerModule({
    id: 'debugging',
    name: t($settings.$label),
    items: [{
        id: 'saveLogs',
        type: 'switch',
        label: t($settings.$saveLogs.$label),
        caption: t($settings.$saveLogs.$caption),
        icon: FileEditIcon,
        value: saveLogs,
        // 虽然实时生效，但是最好刷新页面后再重新记录日志，这样日志才比较完整
        reload: true,
    }, {
        id: 'exportLogs',
        type: 'button',
        label: t($settings.$exportLogs.$label),
        caption: t($settings.$exportLogs.$caption),
        icon: FileExportIcon,
        // slots: {
        //     icon: FileExportIcon,
        // },
        props: {
            async onClick(_e: PointerEvent) {
                const logText = JSON.stringify(storage.get('logs'));
                await saveAs(logText, `${ GM_info.script.name } - ${ new Date().toLocaleString() }.json`);
            }
        },
        value: ref(t($settings.$exportLogs.$button)),
    }, {
        id: 'clearLogs',
        type: 'button',
        label: t($settings.$clearLogs.$label),
        caption: t($settings.$clearLogs.$caption),
        icon: FileExportIcon,
        // slots: {
        //     icon: FileExportIcon,
        // },
        props: {
            async onClick(_e: PointerEvent) {
                const logText = JSON.stringify(storage.get('logs'));
                const size = new Blob([ logText ], { type: 'text:plain' }).size;
                const strSize = storage.has('logs') ? stringifyBytes(size) : '0B';
                storage.delete('logs');

                const $cleared = $settings.$clearLogs.$cleared;
                toast({
                    summary: t($cleared.$summary),
                    detail: t($cleared.$detail, { size: strSize }),
                    severity: 'success',
                    life: 3000,
                });
            }
        },
        value: ref(t($settings.$clearLogs.$button)),
    }],
});

// 写入日志到存储
/**
 * 将日志写入到存储  
 * 如果用户未开启保存日志，则什么都不做
 * @param log 日志条目
 */
const saveLog = (log: LogItem) => {
    if (!saveLogs.value) return;
    const logs = storage.get('logs');
    const logPage = logs.find(page => page.timeOrigin === performance.timeOrigin) ?? {
        timeOrigin: performance.timeOrigin,
        items: [],
        url: location.href,
    };
    if (!logs.includes(logPage)) {
        logs.push(logPage);
        logs.splice(0, logs.length - MAX_LOG_PAGES);
    }
    const data = Object.assign({}, log);
    data.content = safeSerialize(data.content);
    logPage.items.push(data);
    logPage.items.splice(0, logPage.items.length - MAX_LOG_ITEMS);
    storage.set('logs', logs);
};
// 写入先前缓存的日志
globalLogger.readCache().forEach(log => saveLog(log));
// 停止记录缓存
globalLogger.cacheLogs = false;
// 开始监听并写入新日志
globalLogger.events.on('log', saveLog);


// 全局捕获错误，当出现错误时记录为日志
window.addEventListener('error', e => {
    logger.log('Error', 'raw', null, {
        type: 'global error',
        error: e.error,
        message: e.message,
        filename: e.filename,
    });
});
window.addEventListener('unhandledrejection', e => {
    logger.log('Error', 'raw', null, {
        type: 'global unhandled rejection',
        reason: e.reason,
    });
});
