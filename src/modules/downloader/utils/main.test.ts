import { beforeEach, describe, expect, it, vi } from 'vitest';

// #region mock：避免加载浏览器UI/i18n相关模块

vi.mock('@/i18n/main.js', () => ({
    default: { global: { t: (key: string) => key } },
}));
vi.mock('@/utils/helpers/toast/main.js', () => ({
    toast: Object.assign(() => {}, { add: () => {}, remove: () => {} }),
}));
vi.mock('@/styling.js', () => ({
    styling: { applyTo: () => () => {} },
}));

// #endregion

import { constructFilename, getFilenameTemplate } from './main.js';
import { globalStorage } from '@/storage.js';

const storage = globalStorage.withKeys('downloader');

beforeEach(() => {
    storage.delete('filename');
    storage.delete('filenameBySite');
});

describe('constructFilename', () => {
    it('默认模板使用原始文件名', () => {
        expect(constructFilename([], { name: 'photo.jpg', path: '/a/b/photo.jpg' }, 1))
            .toBe('photo.jpg');
    });

    it('meta链中的变量被替换，就近优先', () => {
        const chain = [
            { Title: 'batch-title', Creator: 'Root' },
            { Title: 'post-title', Creator: 'Enuni' },
        ];
        expect(constructFilename(chain, { name: 'photo.jpg', path: '/p.jpg' }, 1, '{Title}_{Creator}_{Name}'))
            .toBe('post-title_Enuni_photo.jpg');
    });

    it('缺失的meta键使用占位符（null时使用键名填充）', () => {
        expect(constructFilename([], { name: 'a.png', path: '/a.png' }, 1, '{Title}-{Name}', 'MISSING'))
            .toBe('MISSING-a.png');
        // 与旧实现一致：占位符为null时使用键名填充
        expect(constructFilename([], { name: 'a.png', path: '/a.png' }, 1, '{Title}-{Name}'))
            .toBe('Title-a.png');
    });

    it('P/Name/Base/Ext 由文件信息计算', () => {
        expect(constructFilename([], { name: 'abc.png', path: '/x/abc.png' }, 3, '{P}_{Base}_{Ext}'))
            .toBe('3_abc_png');
    });

    it('日期类token默认前导零填充（Month/Date/Hour/Minute/Second）', () => {
        const meta = { Year: 2026, Month: 9, Date: 3, Hour: 8, Minute: 5, Second: 7 };
        expect(constructFilename([meta], { name: 'a.jpg', path: '/a.jpg' }, 1, '{Year}-{Month}-{Date} {Hour}:{Minute}:{Second}'))
            .toBe('2026-09-03 08:05:07');
    });

    it('P默认无前导零，{P:NN}指定零填充宽度', () => {
        expect(constructFilename([], { name: 'a.jpg', path: '/a.jpg' }, 3, '{P}')).toBe('3');
        expect(constructFilename([], { name: 'a.jpg', path: '/a.jpg' }, 3, '{P:02}')).toBe('03');
        expect(constructFilename([], { name: 'a.jpg', path: '/a.jpg' }, 3, '{P:3}')).toBe('003');
        expect(constructFilename([], { name: 'a.jpg', path: '/a.jpg' }, 3, '{P:1}')).toBe('3');
    });

    it('日期类token也可用{Month:1}去掉前导零', () => {
        const meta = { Month: 9 };
        expect(constructFilename([meta], { name: 'a.jpg', path: '/a.jpg' }, 1, '{Month}-{Month:1}'))
            .toBe('09-9');
    });

    it('缺失的键带宽度时仍使用占位符', () => {
        expect(constructFilename([], { name: 'a.png', path: '/a.png' }, 1, '{Title:02}-{Name}', 'MISSING'))
            .toBe('MISSING-a.png');
    });

    it('未知token保持原样，大小写不敏感替换', () => {
        expect(constructFilename([{ Title: 'T' }], { name: 'a.jpg', path: '/a.jpg' }, 1, '{Unknown}-{title}'))
            .toBe('{Unknown}-T');
    });

    it('windows非法字符转全角', () => {
        expect(constructFilename([{ Title: 'a:b*c?' }], { name: 'f.txt', path: '/f.txt' }, 1, '{Title}_{Name}'))
            .toBe('a：b＊c？_f.txt');
    });

    it('清理路径开头/分隔符前后的空格与点号', () => {
        expect(constructFilename([], { name: 'name.txt', path: '/n.txt' }, 1, ' {Name}'))
            .toBe('name.txt');
        expect(constructFilename([], { name: 'name.txt', path: '/n.txt' }, 1, 'Dir/ {Name}'))
            .toBe('Dir/name.txt');
    });

    it('meta中的非法字符同样被转义', () => {
        expect(constructFilename([{ Creator: 'a/b' }], { name: 'f.txt', path: '/f.txt' }, 1, '{Creator}_{Name}'))
            .toBe('a／b_f.txt');
    });
});

describe('getFilenameTemplate', () => {
    it('无站点专属模板时回退到通用模板', () => {
        storage.set('filename', '{Name}');
        expect(getFilenameTemplate('kemono')).toBe('{Name}');
    });

    it('站点专属模板优先于通用模板', () => {
        storage.set('filename', '{Name}');
        storage.set('filenameBySite', { kemono: '{Title}/{Name}' });
        expect(getFilenameTemplate('kemono')).toBe('{Title}/{Name}');
        // 其他站点不受影响
        expect(getFilenameTemplate('pawchive')).toBe('{Name}');
    });
});
