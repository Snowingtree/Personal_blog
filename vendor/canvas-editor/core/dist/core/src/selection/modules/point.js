import { isNumber } from "sketching-utils";
import { Editor } from "../../editor";
export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    clone() {
        return new Point(this.x, this.y);
    }
    diff(target) {
        return { x: target.x - this.x, y: target.y - this.y };
    }
    in(range) {
        return (this.x >= range.start.x &&
            this.x <= range.end.x &&
            this.y >= range.start.y &&
            this.y <= range.end.y);
    }
    static from(a, b) {
        if (a instanceof MouseEvent && b instanceof Editor) {
            const { offsetX, offsetY } = b.canvas.getRect();
            return new Point(a.offsetX + offsetX, a.offsetY + offsetY);
        }
        else if (isNumber(a) && isNumber(b)) {
            return new Point(a, b);
        }
        return new Point(0, 0);
    }
    static isEqual(origin, target) {
        if (origin === target)
            return true;
        if (!origin || !target)
            return false;
        return origin.x === target.x && origin.y === target.y;
    }
}
