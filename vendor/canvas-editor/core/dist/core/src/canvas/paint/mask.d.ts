import type { Editor } from "../../editor";
import { Range } from "../../selection/modules/range";
import type { Canvas } from "../index";
import type { DrawingEffectOptions } from "../types/paint";
import { CURSOR_STATE } from "../utils/constant";
export declare class Mask {
    private editor;
    private engine;
    private range;
    private effects;
    private canvas;
    ctx: CanvasRenderingContext2D;
    private timer;
    constructor(editor: Editor, engine: Canvas);
    onMount(dom: HTMLDivElement): void;
    destroy(dom: HTMLDivElement): void;
    private collectEffects;
    private drawing;
    private batchDrawing;
    drawingEffect(range: Range, options?: DrawingEffectOptions): undefined;
    setCursorState(type: keyof typeof CURSOR_STATE | null): this;
    focus(): void;
    isActive(): boolean;
    reset(): void;
    resetCtx(): void;
    clearWithOp(): void;
    clear(range?: Range): void;
}
