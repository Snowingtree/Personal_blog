import type { DeltaLike } from "sketching-delta";
import { Delta } from "sketching-delta";
import { Point } from "./point";
export declare class Range {
    readonly start: Point;
    readonly end: Point;
    constructor(options: {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    });
    zoom(size: number): Range;
    compose(range: Range | null): Range;
    move(x: number, y: number): Range;
    clone(): Range;
    flat(): {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    };
    flatten(): {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    };
    rect(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    center(): Point;
    normalize(): Range;
    in(range: Range): boolean;
    intersect(range: Range): boolean;
    include(point: Point): boolean;
    static reset(): Range;
    static from(delta: Delta): Range;
    static from(delta: DeltaLike): Range;
    static from(endX: number, endY: number): Range;
    static from(startX: number, startY: number, endX: number, endY: number): Range;
    static fromRect(x: number, y: number, width: number, height: number): Range;
    static isEqual(origin: Range | null, target: Range | null): boolean;
}
