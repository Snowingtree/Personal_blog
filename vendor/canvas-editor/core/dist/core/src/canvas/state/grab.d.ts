import type { Editor } from "../../editor";
import type { Canvas } from "../index";
export declare class Grab {
    private editor;
    private engine;
    private _on;
    private disable;
    private landing;
    constructor(editor: Editor, engine: Canvas);
    destroy(): void;
    get on(): boolean;
    setState(enable: boolean): void;
    start(): undefined;
    close(): undefined;
    private onTranslate;
    translateImmediately: (x: number, y: number) => undefined;
    translate: (x: number, y: number) => void;
    private onMouseDown;
    private onMouseMoveBasic;
    private onMouseMove;
    private onMouseUp;
}
