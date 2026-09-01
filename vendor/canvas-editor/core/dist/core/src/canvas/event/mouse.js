import { Event } from "./basic";
export class MouseEvent extends Event {
    constructor(event, offsetX, offsetY, 
    // 默认不捕获 默认不冒泡
    options = { bubble: false, capture: false }) {
        super(options);
        this.x = event.offsetX + offsetX;
        this.y = event.offsetY + offsetY;
        this.metaKey = event.metaKey;
        this.ctrlKey = event.ctrlKey;
        this.shiftKey = event.shiftKey;
        this.altKey = event.altKey;
        this.native = event;
        this.clientX = event.clientX;
        this.clientY = event.clientY;
    }
    static from(event, editor) {
        const { offsetX, offsetY } = editor.canvas.getRect();
        return new MouseEvent(event, offsetX, offsetY);
    }
}
