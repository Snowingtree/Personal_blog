import type { DeltaOptions } from "sketching-delta";
import { Delta } from "sketching-delta";
export declare class Image extends Delta {
    static KEY: string;
    key: string;
    private loaded;
    private image;
    constructor(options: DeltaOptions);
    setRect(x: number, y: number, width: number, height: number, z?: number): this;
    drawing: (ctx: CanvasRenderingContext2D) => Promise<Delta> | undefined;
    private updateImage;
    setAttr(key: string, value: string | null): this;
    static create: (options: DeltaOptions) => Image;
}
