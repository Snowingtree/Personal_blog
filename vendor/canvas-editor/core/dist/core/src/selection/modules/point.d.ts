import { Editor } from "../../editor";
import type { Range } from "./range";
export declare class Point {
    readonly x: number;
    readonly y: number;
    constructor(x: number, y: number);
    clone(): Point;
    diff(target: Point): {
        x: number;
        y: number;
    };
    in(range: Range): boolean;
    static from(x: number, y: number): Point;
    static from(event: globalThis.MouseEvent, editor: Editor): Point;
    static isEqual(origin: Point | null, target: Point | null): boolean;
}
