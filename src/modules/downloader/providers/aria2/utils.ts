import { Status } from "../../types/interface/task";

/**
 * 将任意数量的路径片段连接为一个使用正斜杠`/`分隔的路径
 * 每个片段都会被独立地按`/`和`\`规范化，因此支持空片段、缺少分隔符的裸文件名、
 * 以及正斜杠/反斜杠混用的片段——不要求所有片段使用相同的路径分隔符
 */
export function buildPath(...parts: string[]): string {
    return parts
        .filter(Boolean)
        .flatMap(part => part.replaceAll('\\', '/').split('/'))
        .filter(Boolean)
        .join('/');
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