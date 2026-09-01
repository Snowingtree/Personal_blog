import type { Editor } from "../../editor";
import { Point } from "../../selection/modules/point";
import { ElementNode } from "../dom/element";
import { FrameNode } from "../dom/frame";
import { Node } from "../dom/node";
import { ResizeNode } from "../dom/resize";
import { SelectNode } from "../dom/select";
import { MouseEvent } from "../event/mouse";
import type { Canvas } from "../index";
export declare class Root extends Node {
    private editor;
    private engine;
    /** 鼠标指针位置 */
    cursor: Point;
    /** Hover 节点 */
    hover: ElementNode | ResizeNode | null;
    /** 框选节点引用 */
    readonly frame: FrameNode;
    /** 选择节点引用 */
    readonly select: SelectNode;
    constructor(editor: Editor, engine: Canvas);
    destroy(): void;
    createNodeStateTree(): void;
    getFlatNode(isEventCall?: boolean): Node[];
    onMouseDown: (e: MouseEvent) => void;
    private emit;
    private onMouseDownController;
    private onMouseMoveBasic;
    private onMouseMoveController;
    private onMouseUpController;
}
