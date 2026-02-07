/**
 * Popup Manager
 * 管理所有弹出层（包括但不限于Dialog组件在内的所有弹出层）
 * 实现弹出层层级协调组织、父子关系与状态继承等等
 */

import { v4 as uuid } from "uuid";
import { PopupInfo, PopupState } from "./popup-manager-types";
import { computed, reactive, ref, toRaw, watch } from "vue";
import { Nullable, useListEffect } from "@/utils/main";

/** 基础z-index，所有Popup的z轴层级都应该再此之上叠加 */
export let zIndexBase = 1000000;

/** 存储所有PopupInfo */
const popups = ref<PopupInfo[]>([]);

/**
 * 存储所有计算后的PopupState
 */
const states = computed(() => {
    const states = popups.value.map((info, i) => {
        const id = info.id;

        // 可见性
        let visible = info.visible;
        let popup: PopupInfo = info;
        while (visible) {
            const parent = getPopupInfo(popup.parent);
            if (!parent) break;
            visible = parent.visible;
            popup = parent;
        }

        // 是否被后代阻塞
        const ancestorBlocked = (popup: PopupInfo): Nullable<string> => popup.children.reduce(
            (id, c) => id ?? c.block === 'uncestor' ? c.id : ancestorBlocked(c),
            null as Nullable<string>
        );
        const blocked = popup.children.find(c => c.block === 'parent')?.id ?? ancestorBlocked(info);

        // 禁用状态
        const isDisabled = (popup: PopupInfo): boolean => popup.disabled || !!getPopupInfo(popup.parent)?.disabled;
        const disabled: boolean = isDisabled(info);

        // z-index
        // 这里简单赋值，后续统一计算
        const zIndex = zIndexBase;

        // 合成PopupState对象
        const state: PopupState = { id, visible, blocked, disabled, zIndex };

        return state;
    });

    // 计算z-index
    // 从根层级popup节点开始，计算每个popup节点z-index
    const rootPopups = popups.value.filter(p => p.parent === null);

    /**
     * 为给定的同一层级的所有节点计算并赋值z-index
     * @param popups 需计算的同层级节点
     * @param height 这些节点的父级节点的z-index值
     * @returns 森林中最高节点的z-index值（即子树中的最大z-index值）
     */
    const calcChildrenZIndex = (popups: PopupInfo[], height: number): number => {
        // 从低（小z-index）到高（大z-index）逐节点计算其z-index值

        /** p-index从小到大排列的子节点列表 */
        const sorted = popups.toSorted((c1, c2) => c1.pIndex - c2.pIndex);

        // 计算子节点z-index值
        sorted.forEach((child, i) => {
            const state = getPopupState(child.id)!;

            // 计算子节点z-index值
            if (i === 0) {
                // 最低子节点的z-index等于父节点z-index + 1
                state.zIndex = ++height;
            } else {
                // 其余子节点的z-index = 该节点下方节点所在子树的最高z-index + 与该节点下方节点的p-index差距
                const lastChild = sorted[i-1];
                const distance = (child.pIndex ?? 0) - (lastChild.pIndex ?? 0);
                state.zIndex = height + distance;
            }

            // 计算当前节点的子树并更新height为子树最高节点z-index
            height = calcChildrenZIndex(child.children, height);
        });

        return height;
    };

    calcChildrenZIndex(rootPopups, zIndexBase);

    return states;
});

/**
 * 创建新Popup
 * @param info Popup状态选项 
 * @returns Popup ID
 */
export function newPopup(info: Partial<PopupInfo>): string {
    const fullInfo: PopupInfo = {
        id: uuid(),
        parent: null,
        children: [],
        visible: true,
        disabled: false,
        block: 'none',
        pIndex: 0,
    };
    popups.value.push(Object.assign(fullInfo, info));
    return fullInfo.id;
};

/**
 * 根据id获取PopupInfo
 */
export function getPopupInfo(id: Nullable<string>): Nullable<PopupInfo> {
    return id ? popups.value.find(info => info.id === id) ?? null : null;
}

/**
 * 根据id获取PopupState
 */
export function getPopupState(id: Nullable<string>): Nullable<PopupState> {
    return id ? states.value.find(info => info.id === id) ?? null : null;
}