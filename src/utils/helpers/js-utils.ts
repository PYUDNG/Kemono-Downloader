import { GM_info } from "$";

/** @satisfies {Record<string, (...args: any[]) => boolean>} */
const checkers = {
    'switch': (val: any) => !!val,
    'url': (val: string) => location.href === val,
    'path': (val: string) => location.pathname === val,
    'host': (val: string) => location.host === val,
    'regurl': (val: RegExp) => !!location.href.match(val),
    'regpath': (val: RegExp) => !!location.pathname.match(val),
    'reghost': (val: RegExp) => !!location.host.match(val),
    'starturl': (val: string) => location.href.startsWith(val),
    'startpath': (val: string) => location.pathname.startsWith(val),
    'endhost': (val: string) => location.host.endsWith(val),
    'func': (val: Function) => !!val(),
};

export type CheckerType = keyof typeof checkers;

export type Checker = {
    [T in CheckerType]: {
        /** 类型 */
        type: T;
        /** 值 */
        value: Parameters<typeof checkers[T]>[0];
        /** 是否反转判断结果 */
        invert?: boolean;
    }
}[CheckerType];

/**
 * 检查给定checker是否通过
 */
export function testChecker(
    checker: Checker | Checker[],
    mode: 'and' | 'or' = 'or',
): boolean {
    if (Array.isArray(checker)) {
        // 数组场景
        if (mode === 'and')
            return checker.every(c => testChecker(c));
        else
            return checker.some(c => testChecker(c))
    }

    // 单个 Checker 场景：调用对应 checker 函数
    const result = checkers[checker.type](checker.value);

    // 利用 !== 运算符实现反转逻辑
    const invert = !!checker.invert;
    return invert !== result;
}

type LogLevel = keyof typeof Logger.Level;
type LogLevelNum = typeof Logger.Level[LogLevel];
type ConsoleMethods = {
  [K in keyof Console]: Console[K] extends (...args: any[]) => any ? K : never
}[keyof Console];

class Logger {
    /**
     * 日志等级，数值越大越容易实际输出
     */
    public static readonly Level = {
        /** 调试输出，必须对用户不可见 */
        Debug: 0 as 0,

        /** 详细信息输出 */
        Detail: 1 as 1,

        /** 常规信息输出 */
        Info: 2 as 2,

        /** 警告信息输出，用于输出不影响运行的异常等 */
        Warning: 3 as 3,

        /** 错误信息输出，用于输出影响运行的错误 */
        Error: 4 as 4,

        /** 重要信息输出，应当对用户可见 */
        Important: 5 as 5,
    };

    /**
     * 当前日志输出等级
     * @default Logger.Level.Info
     */
    public level: LogLevelNum = Logger.Level.Info;

    /**
     * 日志等级所对应的纯文本输出颜色
     */
    public static readonly LevelColor: Record<LogLevel, string> = {
        Debug: '#94a3b8',
        Detail: '#10b981',
        Info: 'inherit',
        Warning: '#f59e0b',
        Error: '#ef4444',
        Important: '#a855f7',
    };

    /**
     * 纯文本日志输出的前缀的颜色
     */
    public static readonly PrefixColor = '#6366f1';

    constructor() {}

    /**
     * 写文本日志
     * @param level 此条日志的等级
     * @param type 根据level格式化的纯文本消息
     * @param content 文本消息内容
     * @returns 根据此条日志的等级和当前输出等级，此条日志最终是否被输出
     */
    log(level: LogLevel, type: 'string', logger: ConsoleMethods, content: string): boolean

    /**
     * 写任意类型日志
     * @param level 此条日志的等级
     * @param type 按原样输出的任意类型数据
     * @param content 日志数据内容
     * @returns 根据此条日志的等级和当前输出等级，此条日志最终是否被输出
     */
    log(level: LogLevel, type: 'raw', logger: ConsoleMethods, ...content: any[]): boolean

    log(
        level: LogLevel,
        type: 'string' | 'raw',
        logger: ConsoleMethods = 'log',
        ...content: any[]
    ): boolean {
        // 仅当等级达到当前输出等级及以上时才输出
        const numLevel = Logger.Level[level];
        if (numLevel < this.level) return false;

        // 纯文本输出：按照预定义颜色格式化
        if (isStringLog(content)) {
            content = [
                `%c[${ GM_info.script.name }] [${ level }]\n%c${ content[0] }`,
                `color: ${ Logger.PrefixColor };`,
                `color: ${ Logger.LevelColor[level] };`,
            ];
        }

        console[logger].apply(null, content);

        return true;

        // @ts-ignore: Unused parameter
        function isStringLog(content: any[]): content is string[] {
            return type === 'string';
        }
    }

    /**
     * 简化调用：写字符串日志
     */
    simple(level: LogLevel, content: string): ReturnType<typeof this.log> {
        return this.log(level, 'string', 'log', content);
    }
}

export const logger = new Logger();
logger.level = import.meta.env.PROD ? Logger.Level.Info : Logger.Level.Debug;