import type { Range } from "../../selection/modules/range";
import { Node } from "./node";
export declare class EmptyNode extends Node {
    type: string;
    constructor(type: string, range: Range);
    drawingMask: (ctx: CanvasRenderingContext2D) => void;
}
