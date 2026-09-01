import type { DeltaLike } from "sketching-delta";
import type { Editor } from "../../editor";
import type { Canvas } from "../index";
export declare class Insert {
    private editor;
    private engine;
    private _on;
    private delta;
    private range;
    private landing;
    private dragged;
    private landingClient;
    constructor(editor: Editor, engine: Canvas);
    destroy(): void;
    get on(): boolean;
    start(data: DeltaLike): undefined;
    close(): undefined;
    private bindOpEvents;
    private unbindOpEvents;
    private onMouseDownController;
    private onMouseMoveBasic;
    private onMouseMoveController;
    private onMouseUpController;
    onDrop: (e: DragEvent) => undefined;
    drawingMask(finish?: boolean): void;
}
