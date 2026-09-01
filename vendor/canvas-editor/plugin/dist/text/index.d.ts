import type { DeltaOptions } from "sketching-delta";
import { Delta } from "sketching-delta";
export declare class Text extends Delta {
    static KEY: string;
    key: string;
    drawing: (ctx: CanvasRenderingContext2D) => void;
    static create: (options: DeltaOptions) => Text;
}
