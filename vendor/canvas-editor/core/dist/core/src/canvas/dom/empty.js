import { GRAY_3 } from "sketching-utils";
import { Shape } from "../utils/shape";
import { Node } from "./node";
export class EmptyNode extends Node {
    constructor(type, range) {
        super(range);
        this.type = type;
        this.drawingMask = (ctx) => {
            const { x, y, width, height } = this.range.rect();
            Shape.rect(ctx, {
                x: x,
                y: y,
                width: width,
                height: height,
                fillColor: GRAY_3,
            });
        };
        this.setZ(-1);
        this.setIgnoreEvent(true);
    }
}
