import { describe, expect, it } from 'vitest';
import { decideModuleActions } from './loader-actions.js';

describe('decideModuleActions', () => {
    it('未激活→激活：仅enter（即使声明remount）', () => {
        expect(decideModuleActions(false, true, true, true)).toEqual(['enter']);
        expect(decideModuleActions(false, true, false, false)).toEqual(['enter']);
    });

    it('激活→未激活：仅leave', () => {
        expect(decideModuleActions(true, false, true, false)).toEqual(['leave']);
        expect(decideModuleActions(true, false, false, true)).toEqual(['leave']);
    });

    it('保持激活且URL未变：无动作', () => {
        expect(decideModuleActions(true, true, false, true)).toEqual([]);
        expect(decideModuleActions(true, true, false, false)).toEqual([]);
    });

    it('保持激活+URL已变+未声明remount：无动作（全局模块不受影响）', () => {
        expect(decideModuleActions(true, true, true, false)).toEqual([]);
    });

    it('保持激活+URL已变+声明remount：remount（同类型页面跳转重新挂载）', () => {
        expect(decideModuleActions(true, true, true, true)).toEqual(['remount']);
    });
});
