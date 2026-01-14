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

    /**
     * 纯文本日志输出的路径前缀的颜色
     * 在浅色和深色模式下都清晰可见，比脚本名称更显眼
     */
    public static readonly PrefixPathColor = '#f97316';

    /**
     * 记录当前logger所属的作用域路径，在输出时可用作前缀以帮助调试辨识日志来源
     */
    public prefixPath: string[] = [];

    constructor({
        level = Logger.Level.Info,
        path = [],
    }: {
        /** 日志输出等级 */
        level?: LogLevel | LogLevelNum,
        /** logger所属作用域路径 */
        path?: string[]
    } = {}) {
        this.level = typeof level === 'string' ?
            Logger.Level[level] : level;
        this.prefixPath.push(...path);
    }

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
            const prefix = this.prefixPath.join('.');
            content = [
                `%c[${ GM_info.script.name }] %c[${ prefix }] %c[${ level }]\n${ content[0] }`,
                `color: ${ Logger.PrefixColor };`,
                `color: ${ Logger.PrefixPathColor };`,
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

    /**
     * 从当前logger衍生一个新的、拥有更深一层作用域路径的logger实例
     * @param name 新增作用域层名称
     */
    withPath(name: string) {
        return new Logger({
            level: this.level,
            path: this.prefixPath.concat(name),
        });
    }
}

export const logger = new Logger();
logger.level = import.meta.env.PROD ? Logger.Level.Info : Logger.Level.Debug;

export const buildCssText = (styles: Record<string, string>) => Object.entries(styles).map(([key, val]) => `${key}: ${val};`).join(' ');

/**
 * 深度比较两个值是否相等（值相等，不要求引用相等）
 * 本函数由deepseek编写的代码再编辑而成
 * @param value1 - 第一个值
 * @param value2 - 第二个值
 * @param sorting - 是否考虑顺序（数组元素顺序、对象属性顺序等）
 * @returns 如果两个值深度相等则返回true，否则返回false
 */
export function deepEqual(value1: any, value2: any, sorting: boolean = true): boolean {
    // 处理基本类型的快速比较
    if (value1 === value2) return true;

    // 处理null和undefined
    if (value1 == null || value2 == null) {
        return value1 === value2;
    }

    // 处理NaN
    if (Number.isNaN(value1) && Number.isNaN(value2)) return true;

    // 检查类型是否一致
    if (typeof value1 !== typeof value2) return false;

    // 处理基本类型（经过前面的比较，这里肯定不相等）
    if (typeof value1 !== "object") return false;

    // 处理数组
    if (Array.isArray(value1)) {
        if (!Array.isArray(value2)) return false;
        if (value1.length !== value2.length) return false;

        // 如果考虑顺序，直接按顺序比较
        if (sorting) {
            for (let i = 0; i < value1.length; i++) {
                if (!deepEqual(value1[i], value2[i], sorting)) {
                    return false;
                }
            }
            return true;
        }

        // 如果不考虑顺序，需要检查每个元素是否在另一个数组中存在
        const arr2Copy = [...value2];
        for (const item1 of value1) {
            let found = false;
            for (let j = 0; j < arr2Copy.length; j++) {
                if (deepEqual(item1, arr2Copy[j], sorting)) {
                    arr2Copy.splice(j, 1);
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    // 处理对象
    if (typeof value1 === "object" && typeof value2 === "object") {
        const keys1 = Object.keys(value1);
        const keys2 = Object.keys(value2);

        // 检查key数量
        if (keys1.length !== keys2.length) return false;

        // 如果考虑顺序，先检查key顺序是否一致
        if (sorting) {
            for (let i = 0; i < keys1.length; i++) {
                if (keys1[i] !== keys2[i]) return false;
            }
        } else {
            // 如果不考虑顺序，检查key集合是否相同
            const keys1Set = new Set(keys1);
            for (const key of keys2) {
                if (!keys1Set.has(key)) return false;
            }
        }

        // 递归比较每个属性值
        for (const key of keys1) {
            if (!deepEqual(value1[key], value2[key], sorting)) {
                return false;
            }
        }
        return true;
    }

    // 其他情况（如Date、RegExp等）可以在这里添加特殊处理
    // 目前简单转为字符串比较
    return String(value1) === String(value2);
}