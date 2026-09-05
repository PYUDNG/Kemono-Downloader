import { describe, expect, it } from 'vitest';
import { isImageFile } from './file-type.js';

describe('isImageFile', () => {
    it('识别常见图片扩展名', () => {
        expect(isImageFile({ path: '/a/b.jpg' })).toBe(true);
        expect(isImageFile({ path: '/a/b.JPEG' })).toBe(true);
        expect(isImageFile({ path: '/a/b.png' })).toBe(true);
        expect(isImageFile({ path: '/a/b.webp' })).toBe(true);
        expect(isImageFile({ name: 'c.gif', path: '/x/c' })).toBe(true);
    });

    it('识别非图片（视频/压缩包等）', () => {
        expect(isImageFile({ path: '/a/b.mp4' })).toBe(false);
        expect(isImageFile({ path: '/a/b.zip' })).toBe(false);
        expect(isImageFile({ name: 'b.mov', path: '/a/b' })).toBe(false);
    });

    it('无扩展名视为非图片', () => {
        expect(isImageFile({ path: '/a/b' })).toBe(false);
        expect(isImageFile({ name: 'b', path: '/a/b' })).toBe(false);
    });
});
