import { Nullable } from "@/utils/main";

/**
 * 表示一个弹出层未受影响的、设计上的状态  
 * 这里的属性不仅仅可以影响自身状态，还可能会影响其他弹出层状态
 */
export interface PopupInfo {
    /**
     * 全局唯一标识符
     */
    id: string;

    /**
     * 父级弹出层id（如果有）
     */
    parent: Nullable<string>;

    /**
     * 直接子弹出层列表
     */
    children: PopupInfo[];

    /**
     * 自身及其后代弹出层可见性
     */
    visible: boolean;

    /**
     * 类似z-index的z轴高度  
     * 该值不会直接作为z-index应用到DOM，而会在综合计算所有弹出层的pIndex、父子级关系、创建顺序等等因素后，得到最终应用到DOM的z-index
     */
    pIndex: number;

    /**
     * 该弹出层及其后代弹出层是否被禁用
     */
    disabled: boolean;

    /**
     * 是否独占焦点且阻塞父弹出层  
     * - 'none': 不阻塞任何其他弹出层
     * - 'parent': 阻塞其直接父弹出层
     * - 'uncestor': 阻塞其所有祖先弹出层（即：阻塞整个弹出层树中除了本弹出层及弹出层子树外的所有弹出层）
     */
    block: 'none' | 'parent' | 'uncestor';
}

/**
 * 表示一个弹出层经计算后的、综合考虑所有弹出层互相影响后的实际状态  
 * 这里的属性仅影响自身（当前弹出层）状态
 */
export interface PopupState {
    /**
     * 全局唯一标识符
     */
    id: string;

    /**
     * 可见性
     */
    visible: boolean;
    
    /**
     * 是否被禁用
     */
    disabled: boolean;

    /**
     * 是否被其他弹出层阻塞  
     * 类型为阻塞此弹出层的其他弹出层id
     */
    blocked: Nullable<string>;

    /**
     * 应用到DOM的z-index（z轴高度）
     */
    zIndex: number;
}