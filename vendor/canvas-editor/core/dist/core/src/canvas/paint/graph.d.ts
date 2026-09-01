import type { Editor } from "../../editor";
import { Range } from "../../selection/modules/range";
import type { Canvas } from "../index";
import type { DrawingGraphEffectOptions } from "../types/paint";
export declare class Graph {
    private editor;
    private engine;
    private canvas;
    ctx: CanvasRenderingContext2D;
    constructor(editor: Editor, engine: Canvas);
    onMount(dom: HTMLDivElement): void;
    destroy(dom: HTMLDivElement): void;
    private collectEffects;
    private drawingAsyncTasks;
    drawingEffect(range: Range, options?: DrawingGraphEffectOptions): void;
    drawingAll(): void;
    isActive(): boolean;
    reset(): void;
    resetCtx(): void;
    clear(range?: Range): void;
}
