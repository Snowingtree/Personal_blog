import type { Editor } from "../../editor";
import type { DeltaState } from "../../state/modules/node";
import type { MouseEvent } from "../event/mouse";
import { Node } from "./node";
export declare class ElementNode extends Node {
    private editor;
    /** 节点 id */
    readonly id: string;
    /** Hover 状态 */
    private isHovering;
    constructor(editor: Editor, state: DeltaState);
    protected onMouseDown: (e: MouseEvent) => void;
    /**
     * 触发节点的 Hover 效果
     * @description Root - MouseLeave
     */
    protected onMouseEnter: () => undefined;
    /**
     * 移除节点的 Hover 效果
     * @description Root - MouseLeave
     */
    protected onMouseLeave: () => undefined;
    drawingMask: (ctx: CanvasRenderingContext2D) => void;
}
