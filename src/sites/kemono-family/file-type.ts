/**
 * 附件类型判定（站点共享）
 *
 * 仅图片会经由`img.<host>`子域提供缩略图，因此「下载原图」开关只应对图片生效；
 * 视频、压缩包等其他类型一律应使用原始文件URL（`file.`/文件服务器子域）。
 */

/**
 * 视为图片的扩展名集合（以 `img.*` 缩略图服务可正常处理的栅格图为主）
 */
const IMAGE_EXTENSIONS = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'jfif',
    'heic', 'heif', 'tif', 'tiff', 'ico',
]);

/**
 * 根据文件路径/名称的扩展名判断是否为图片附件
 * 优先使用`path`判定（服务器路径，附有扩展名）；`path`无扩展名时回退到`name`
 * @param file 文件信息（API数据）
 */
export function isImageFile(file: { name?: string; path: string }): boolean {
    const candidates = [file.path, file.name ?? ''];

    for (const candidate of candidates) {
        const basename = candidate.substring(candidate.lastIndexOf('/') + 1);
        const dotIndex = basename.lastIndexOf('.');
        // 无扩展名：尝试下一个候选
        if (dotIndex === -1) continue;
        // 存在扩展名：无论是否图片都据此定论
        const ext = basename.substring(dotIndex + 1).toLowerCase();
        return IMAGE_EXTENSIONS.has(ext);
    }

    return false;
}
