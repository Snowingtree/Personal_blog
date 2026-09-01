import { NOOP, throttle } from "sketching-utils";
import { BLUE_5, BLUE_6_6 } from "sketching-utils";
import { EDITOR_EVENT } from "../../event/bus/action";
import { Point } from "../../selection/modules/point";
import { Range } from "../../selection/modules/range";
import { MAX_Z_INDEX, RESIZE_OFS, SELECT_BIAS, THE_CONFIG } from "../utils/constant";
import { Shape } from "../utils/shape";
import { Node } from "./node";
export class FrameNode extends Node {
    constructor(editor, root) {
        super(Range.reset());
        this.editor = editor;
        this.root = root;
        this.bindOpEvents = () => {
            this.editor.event.on(EDITOR_EVENT.MOUSE_UP_GLOBAL, this.onMouseUpController);
            this.editor.event.on(EDITOR_EVENT.MOUSE_MOVE_GLOBAL, this.onMouseMoveController);
        };
        this.unbindOpEvents = () => {
            this.editor.event.off(EDITOR_EVENT.MOUSE_UP_GLOBAL, this.onMouseUpController);
            this.editor.event.off(EDITOR_EVENT.MOUSE_MOVE_GLOBAL, this.onMouseMoveController);
        };
        /**
         * 框选事件的起始
         */
        this.onRootMouseDown = (e) => {
            this.savedRootMouseDown(e);
            this.unbindOpEvents();
            this.bindOpEvents();
            this.landing = Point.from(e.x, e.y);
            this.landingClient = Point.from(e.clientX, e.clientY);
        };
        this.onMouseMoveBridge = (e) => {
            if (!this.landing || !this.landingClient)
                return void 0;
            const point = Point.from(e.clientX, e.clientY);
            const { x, y } = this.landingClient.diff(point);
            if (!this.isDragging && (Math.abs(x) > SELECT_BIAS || Math.abs(y) > SELECT_BIAS)) {
                // 拖拽阈值
                this.isDragging = true;
            }
            if (this.isDragging) {
                const latest = new Range({
                    startX: this.landing.x,
                    startY: this.landing.y,
                    endX: this.landing.x + x,
                    endY: this.landing.y + y,
                }).normalize();
                this.setRange(latest);
                // 获取获取与选区交叉的所有`State`节点
                const effects = [];
                this.editor.state.getDeltasMap().forEach(state => {
                    if (latest.intersect(state.toRange()))
                        effects.push(state.id);
                });
                this.editor.selection.setActiveDelta(...effects);
                const prev = this.dragged || latest;
                const zoomed = latest.compose(prev).zoom(RESIZE_OFS);
                this.dragged = latest;
                this.editor.canvas.mask.drawingEffect(zoomed);
            }
        };
        this.onMouseMoveController = throttle(this.onMouseMoveBridge, ...THE_CONFIG);
        this.onMouseUpController = () => {
            this.unbindOpEvents();
            this.setRange(Range.reset());
            if (this.isDragging) {
                this.dragged && this.editor.canvas.mask.drawingEffect(this.dragged);
            }
            this.landing = null;
            this.isDragging = false;
            this.dragged = null;
            this.setRange(Range.reset());
        };
        this.drawingMask = (ctx) => {
            if (this.isDragging) {
                const { x, y, width, height } = this.range.rect();
                Shape.rect(ctx, { x, y, width, height, borderColor: BLUE_5, fillColor: BLUE_6_6 });
            }
        };
        this.dragged = null;
        this.landing = null;
        this._z = MAX_Z_INDEX;
        this.isDragging = false;
        this.landingClient = null;
        this.setIgnoreEvent(true);
        this.savedRootMouseDown = this.root.onMouseDown || NOOP;
        this.root.onMouseDown = this.onRootMouseDown;
    }
}
