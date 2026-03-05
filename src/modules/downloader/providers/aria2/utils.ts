import { HintedString } from "@/utils/main";
import { Status } from "../../types/interface/task";

/**
 * 将两个路径连接为一个路径  
 * 支持自动识别路径分隔符、保证连接处的分隔符有且只有一个  
 * 要求两个路径使用相同的路径分隔符，否则会报错
 * @param sep 使用此参数可以显式指定路径分隔符，如果提供，将跳过分隔符一致性校验并强制使用此分隔符
 */
export function buildPath(p1: string, p2: string, sep?: HintedString<'/' | '\\'>): string {
    if (!sep) {
        const [sep1, sep2] = [p1, p2].map(p => extractSeparator(p));
        if (sep1 && sep2 && sep1 !== sep2) throw new Error('different seperator found');
        if (!sep1 && !sep2) throw new Error('no seperator found');
        sep = (sep1 ?? sep2) as string;
    }

    const [parts1, parts2] = [p1, p2].map(p => p.split(sep).filter(Boolean));
    return [...parts1, ...parts2].join(sep);
}

/**
 * 将给定的文件路径分离为文件所在文件夹路径和文件名
 * @returns file: 文件名，dir: 文件夹路径
 */
export function path2DirFile(path: string) {
    const sep = extractSeparator(path);
    if (sep) {
        const parts = path.split(sep);
        const file = parts.pop()!;
        const dir = parts.join(sep);
        return { file, dir };
    } else {
        return { file: path, dir: '' };
    }
}

function extractSeparator(path: string): string | undefined {
    const sepReg = /[\/\\]/;
    return path.match(sepReg)?.[0];
}

/**
 * Aria2中，下载任务的所有可能状态
 */
export type Aria2Status = 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';

/**
 * Aria2任务状态 -> Kemono Downloader任务状态对照表
 */
export const ARIA2_STATUS_MAP: Record<Aria2Status, Status> = {
    active: 'ongoing',
    waiting: 'queue',
    paused: 'paused',
    error: 'error',
    complete: 'complete',
    removed: 'aborted',
};