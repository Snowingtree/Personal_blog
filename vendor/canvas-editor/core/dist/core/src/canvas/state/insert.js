import { DeltaSet, Op, OP_TYPE } from "sketching-delta";
import { ROOT_DELTA, throttle, TSON } from "sketching-utils";
import { BLUE_5 } from "sketching-utils";
import { EDITOR_EVENT } from "../../event/bus/action";
import { Point } from "../../selection/modules/point";
import { Range } from "../../selection/modules/range";
import { DRAG_KEY, THE_CONFIG } from "../utils/constant";
import { Shape } from "../utils/shape";
export class Insert {
    constructor(editor, engine) {
        this.editor = editor;
        this.engine = engine;
        this.bindOpEvents = () => {
            this.editor.event.on(EDITOR_EVENT.MOUSE_UP_GLOBAL, this.onMouseUpController);
            this.editor.event.on(EDITOR_EVENT.MOUSE_MOVE_GLOBAL, this.onMouseMoveController);
        };
        this.unbindOpEvents = () => {
            this.editor.event.off(EDITOR_EVENT.MOUSE_UP_GLOBAL, this.onMouseUpController);
            this.editor.event.off(EDITOR_EVENT.MOUSE_MOVE_GLOBAL, this.onMouseMoveController);
        };
        this.onMouseDownController = (e) => {
            this.unbindOpEvents();
            const point = Point.from(e, this.editor);
            this.dragged = Range.from(point.x, point.y, point.x, point.y);
            this.landing = Point.from(e, this.editor);
            this.landingClient = Point.from(e.clientX, e.clientY);
            this.bindOpEvents();
        };
        this.onMouseMoveBasic = (e) => {
            if (!this.landing || !this.landingClient)
                return void 0;
            const point = Point.from(e.clientX, e.clientY);
            const { x, y } = this.landingClient.diff(point);
            const latest = new Range({
                startX: this.landing.x,
                startY: this.landing.y,
                endX: this.landing.x + x,
                endY: this.landing.y + y,
            }).normalize();
            const prev = this.range || latest;
            this.range = latest;
            this.dragged = prev.compose(latest);
            this.drawingMask();
        };
        this.onMouseMoveController = throttle(this.onMouseMoveBasic, ...THE_CONFIG);
        this.onMouseUpController = () => {
            this.unbindOpEvents();
            if (this.range && this.delta) {
                const range = this.range;
                const { x, y, width, height } = range.rect();
                this.delta.setRect(x, y, width, height);
                const parentId = ROOT_DELTA;
                this.editor.state.apply(Op.from(OP_TYPE.INSERT, { delta: this.delta, parentId }));
            }
            this.drawingMask(true);
            this.close();
            this.range = null;
            this.dragged = null;
            this.landing = null;
            this.landingClient = null;
        };
        this.onDrop = (e) => {
            const point = Point.from(e, this.editor);
            const payload = e.dataTransfer && e.dataTransfer.getData(DRAG_KEY);
            if (!payload)
                return void 0;
            const data = TSON.decode(payload);
            if (!data)
                return void 0;
            const deltaLike = Object.assign(Object.assign({}, data), { x: point.x, y: point.y });
            const delta = DeltaSet.create(deltaLike);
            if (delta) {
                const parentId = ROOT_DELTA;
                this.editor.state.apply(Op.from(OP_TYPE.INSERT, { delta, parentId }));
            }
        };
        this._on = false;
        this.delta = null;
        this.range = null;
        this.landing = null;
        this.dragged = null;
        this.landingClient = null;
        this.editor.event.on(EDITOR_EVENT.DROP, this.onDrop);
    }
    destroy() {
        this.editor.event.off(EDITOR_EVENT.DROP, this.onDrop);
    }
    get on() {
        return this._on;
    }
    start(data) {
        if (this._on)
            return void 0;
        this.engine.mask.clearWithOp();
        this.editor.selection.clearActiveDeltas();
        this._on = true;
        this.delta = DeltaSet.create(data);
        this.editor.event.on(EDITOR_EVENT.MOUSE_DOWN, this.onMouseDownController);
    }
    close() {
        if (!this._on)
            return void 0;
        this._on = false;
        this.delta = null;
        this.engine.mask.setCursorState(null);
        this.editor.event.trigger(EDITOR_EVENT.INSERT_STATE, { done: true });
        this.editor.event.off(EDITOR_EVENT.MOUSE_DOWN, this.onMouseDownController);
    }
    drawingMask(finish = false) {
        if (this.dragged) {
            // 清空当前区域内的绘制 相当于避免上次绘制的内容留存
            this.engine.mask.clear(this.dragged.zoom(this.engine.devicePixelRatio));
        }
        if (this.range && this.delta) {
            const ctx = this.engine.mask.ctx;
            const { x, y, width, height } = this.range.rect();
            this.delta.setRect(x, y, width, height);
            this.delta.drawing(ctx);
            !finish && Shape.rect(ctx, { x, y, width, height, borderColor: BLUE_5 });
        }
    }
}
