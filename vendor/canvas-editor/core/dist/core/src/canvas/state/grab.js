import { throttle } from "sketching-utils";
import { EDITOR_EVENT } from "../../event/bus/action";
import { Point } from "../../selection/modules/point";
import { CURSOR_TYPE, THE_CONFIG } from "../utils/constant";
export class Grab {
    constructor(editor, engine) {
        this.editor = editor;
        this.engine = engine;
        this.onTranslate = (e) => {
            if (this.disable)
                return void 0;
            e.preventDefault();
            const { deltaX, deltaY } = e;
            this.translate(deltaX, deltaY);
        };
        this.translateImmediately = (x, y) => {
            if (this.disable)
                return void 0;
            const { offsetX, offsetY } = this.engine.getRect();
            this.engine.setOffset(offsetX + x, offsetY + y);
            this.engine.reset();
        };
        this.translate = throttle(this.translateImmediately, ...THE_CONFIG);
        this.onMouseDown = (event) => {
            this.engine.mask.setCursorState(CURSOR_TYPE.GRABBING);
            this.editor.event.on(EDITOR_EVENT.MOUSE_MOVE_GLOBAL, this.onMouseMove);
            this.editor.event.on(EDITOR_EVENT.MOUSE_UP_GLOBAL, this.onMouseUp);
            this.landing = Point.from(event.clientX, event.clientY);
        };
        this.onMouseMoveBasic = (event) => {
            const point = Point.from(event.clientX, event.clientY);
            if (!this.landing) {
                this.landing = point;
                return void 0;
            }
            const { x, y } = point.diff(this.landing || point);
            this.landing = point;
            this.translateImmediately(x, y);
        };
        this.onMouseMove = throttle(this.onMouseMoveBasic, ...THE_CONFIG);
        this.onMouseUp = () => {
            this.engine.mask.setCursorState(CURSOR_TYPE.GRAB);
            this.editor.event.off(EDITOR_EVENT.MOUSE_MOVE_GLOBAL, this.onMouseMove);
            this.editor.event.off(EDITOR_EVENT.MOUSE_UP_GLOBAL, this.onMouseUp);
        };
        this.landing = null;
        this._on = false;
        this.disable = false;
        this.editor.event.on(EDITOR_EVENT.MOUSE_WHEEL, this.onTranslate);
    }
    destroy() {
        this.editor.event.off(EDITOR_EVENT.MOUSE_WHEEL, this.onTranslate);
    }
    get on() {
        return this._on;
    }
    setState(enable) {
        this.disable = !enable;
    }
    start() {
        if (this._on || this.disable)
            return void 0;
        this.engine.mask.clearWithOp();
        this._on = true;
        this.engine.mask.setCursorState(CURSOR_TYPE.GRAB);
        this.editor.event.on(EDITOR_EVENT.MOUSE_DOWN, this.onMouseDown);
    }
    close() {
        if (!this._on)
            return void 0;
        this._on = false;
        this.engine.mask.setCursorState(null);
        this.editor.event.off(EDITOR_EVENT.MOUSE_DOWN, this.onMouseDown);
        this.editor.event.trigger(EDITOR_EVENT.GRAB_STATE, { done: true });
    }
}
