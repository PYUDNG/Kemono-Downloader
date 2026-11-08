import { describe, expect, it } from 'vitest';
import { isHlsUrl, toThumbnailPath } from './file-path.js';

const HASH = '52bdb562eccf4cfee75e6413d209d6e414fe7fb4d06542ce7274ebfdc2d9bcb3';

describe('toThumbnailPath', () => {
    it('去掉新API路径首段的1位存储前缀', () => {
        expect(toThumbnailPath(`/152/bd/${ HASH }.png`)).toBe(`/52/bd/${ HASH }.png`);
        expect(toThumbnailPath(`/203/ae/03ae3fd94e635dea25062ac85221794d10d465c63ea966b9090fdd8072e09453.mp4`))
            .toBe('/03/ae/03ae3fd94e635dea25062ac85221794d10d465c63ea966b9090fdd8072e09453.mp4');
    });

    it('旧格式路径（首段2字符）保持不变', () => {
        expect(toThumbnailPath('/a/b.jpg')).toBe('/a/b.jpg');
        expect(toThumbnailPath('/d1/61/d161e16b12a71688036941ac4e93bd2779a0141c887048cd9b4cd88865cc3daa.mp4'))
            .toBe('/d1/61/d161e16b12a71688036941ac4e93bd2779a0141c887048cd9b4cd88865cc3daa.mp4');
    });

    it('首段3字符但与文件名哈希不吻合时保持不变', () => {
        expect(toThumbnailPath('/abc/def/cover.jpeg')).toBe('/abc/def/cover.jpeg');
    });

    it('非标准路径形状保持不变', () => {
        expect(toThumbnailPath('/152/bd')).toBe('/152/bd');
        expect(toThumbnailPath('relative/path/file.png')).toBe('relative/path/file.png');
    });
});

describe('isHlsUrl', () => {
    it('识别m3u8播放列表（可带查询参数）', () => {
        expect(isHlsUrl('https://t1.pawchive.pw/v/abc/master.m3u8?e=1&s=2')).toBe(true);
        expect(isHlsUrl('https://example.com/a/b.M3U8')).toBe(true);
    });

    it('普通文件URL与空值返回false', () => {
        expect(isHlsUrl('https://t1.pawchive.pw/f/abc/1.png?e=1')).toBe(false);
        expect(isHlsUrl('https://t1.pawchive.pw/d/abc/1.mp4')).toBe(false);
        expect(isHlsUrl(undefined)).toBe(false);
    });
});
