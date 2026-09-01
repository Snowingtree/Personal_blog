import type { Editor } from "../../editor";
import type { Root } from "../state/root";
import { Node } from "./node";
export declare class FrameNode extends Node {
    private editor;
    private root;
    private isDragging;
    private landing;
    private dragged;
    private landingClient;
    private savedRootMouseDown;
    constructor(editor: Editor, root: Root);
    private bindOpEvents;
    private unbindOpEvents;
    /**
     * 框选事件的起始
     */
    private onRootMouseDown;
    private onMouseMoveBridge;
    private onMouseMoveController;
    private onMouseUpController;
    drawingMask: (ctx: CanvasRenderingContext2D) => void;
}
