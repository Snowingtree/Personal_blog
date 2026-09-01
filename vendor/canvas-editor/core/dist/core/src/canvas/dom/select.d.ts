import type { Editor } from "../../editor";
import type { SelectionChangeEvent } from "../../event/bus/types";
import { Node } from "./node";
import { ReferNode } from "./refer";
export declare class SelectNode extends Node {
    private editor;
    /** 拖拽标识 */
    private _isDragging;
    /** 拖拽点击落点 */
    private landing;
    /** 上次绘制区域 */
    private dragged;
    /** 参考线模块引用 */
    readonly refer: ReferNode;
    constructor(editor: Editor);
    destroy(): void;
    get isDragging(): boolean;
    protected onSelectionChange: (e: SelectionChangeEvent) => void;
    /**
     * 绑定拖拽事件的触发器
     */
    private bindDragEvents;
    /**
     * 取消拖拽事件的触发器
     */
    private unbindDragEvents;
    private onMouseDownController;
    private onMouseMoveBasic;
    private onMouseMoveController;
    private onMouseUpController;
    drawingMask: (ctx: CanvasRenderingContext2D) => void;
    private isInSelectRange;
}
