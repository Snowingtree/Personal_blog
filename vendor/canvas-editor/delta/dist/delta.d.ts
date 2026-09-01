import type { DeltaSet } from "./delta-set";
import type { DeltaAttributes, DeltaOptions, StrictDeltaLike } from "./types";
export declare abstract class Delta {
    abstract readonly key: string;
    readonly id: string;
    protected x: number;
    protected y: number;
    protected z: number;
    protected width: number;
    protected height: number;
    children: string[];
    attrs: DeltaAttributes;
    getDeltaSet?: () => DeltaSet;
    abstract drawing: (ctx: CanvasRenderingContext2D) => void | Promise<Delta>;
    constructor(options: DeltaOptions);
    insert(delta: Delta): this;
    removeChild(id: string): Delta;
    removeChild(delta: Delta): Delta;
    setRect(x: number, y: number, width: number, height: number): this;
    move(x: number, y: number): this;
    moveTo(x: number, y: number): this;
    getAttr(key: string): string | null;
    setAttr(key: string, value: string | null): this;
    getArea(): number;
    getRect(): {
        x: number;
        y: number;
        width: number;
        height: number;
        z: number;
    };
    getZ(): number;
    setZ(z: number): void;
    clone(): this;
    toJSON(): StrictDeltaLike;
}
