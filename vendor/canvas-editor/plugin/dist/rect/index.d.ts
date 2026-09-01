import type { DeltaOptions } from "sketching-delta";
import { Delta } from "sketching-delta";
export declare class Rect extends Delta {
    static KEY: string;
    key: string;
    constructor(options: DeltaOptions);
    drawing: (ctx: CanvasRenderingContext2D) => void;
    static create: (options: DeltaOptions) => Rect;
}
