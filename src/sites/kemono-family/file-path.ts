/**
 * Kemono系文件路径工具
 *
 * 新API在文件路径首段前追加了1位存储前缀（如`/152/bd/52bd….png`），
 * 而`img.<host>`缩略图服务仍按去掉该前缀的哈希路径提供（`/52/bd/52bd….png`）。
 * 该前缀只影响缩略图URL；原文件URL（`file.`/文件服务器子域）仍可使用完整路径。
 */

/**
 * 将路径拆分为`[首段, 次段, 文件名]`
 * 仅匹配`/x/y/file`形式，其他形式返回`null`（保持原样）
 */
function splitPath(path: string): { first: string; second: string; filename: string } | null {
    const segments = path.split('/');
    if (segments.length !== 4 || segments[0] !== '') return null;
    return { first: segments[1], second: segments[2], filename: segments[3] };
}

/**
 * 转换为缩略图服务所需的路径（去掉新API路径首段的1位存储前缀）  
 * 旧格式路径（首段为2字符）原样返回；仅当去掉首字符后与文件名哈希前缀吻合时才判定为新格式，避免误伤
 */
export function toThumbnailPath(path: string): string {
    const parts = splitPath(path);
    if (!parts) return path;
    const { first, second, filename } = parts;
    if (first.length !== 3) return path;
    const stripped = first.slice(1);
    if (!filename.toLowerCase().startsWith((stripped + second).toLowerCase())) return path;
    return `/${ stripped }/${ second }/${ filename }`;
}

/**
 * 是否为HLS播放列表URL  
 * 此类URL返回m3u8文本而非媒体文件，不能作为普通文件直接下载
 */
export function isHlsUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
        return new URL(url).pathname.toLowerCase().endsWith('.m3u8');
    } catch {
        return /\.m3u8(?:$|[?#])/i.test(url);
    }
}
