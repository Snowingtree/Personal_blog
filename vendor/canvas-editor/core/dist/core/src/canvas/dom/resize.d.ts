import type { Editor } from "../../editor";
import { Point } from "../../selection/modules/point";
import { Range } from "../../selection/modules/range";
import type { MouseEvent } from "../event/mouse";
import type { ResizeType } from "../types/dom";
import { Node } from "./node";
export declare class ResizeNode extends Node {
    private editor;
    private type;
    private isResizing;
    private latest;
    private landing;
    private landingRange;
    constructor(editor: Editor, type: ResizeType, parent: Node);
    setRange: (range: Range) => undefined;
    protected onMouseEnter: (e: MouseEvent) => undefined;
    protected onMouseLeave: () => undefined;
    private bindOpEvents;
    private unbindOpEvents;
    protected onMouseDown: (e: MouseEvent) => undefined;
    private onMouseMoveBasic;
    private onMouseMoveController;
    private onMouseUpController;
    setCursorState: (point: Point) => void;
    drawingMask: (ctx: CanvasRenderingContext2D) => undefined;
}
