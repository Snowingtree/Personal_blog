import { BLUE_4 } from "sketching-utils";
import { EDITOR_STATE } from "../../state/utils/constant";
import { Shape } from "../utils/shape";
import { Node } from "./node";
export class ElementNode extends Node {
    constructor(editor, state) {
        const range = state.toRange();
        super(range);
        this.editor = editor;
        this.onMouseDown = (e) => {
            if (e.shiftKey) {
                this.editor.selection.addActiveDelta(this.id);
            }
            else {
                this.editor.selection.setActiveDelta(this.id);
            }
        };
        /**
         * 触发节点的 Hover 效果
         * @description Root - MouseLeave
         */
        this.onMouseEnter = () => {
            this.isHovering = true;
            if (this.editor.selection.has(this.id)) {
                return void 0;
            }
            this.editor.canvas.mask.drawingEffect(this.range);
        };
        /**
         * 移除节点的 Hover 效果
         * @description Root - MouseLeave
         */
        this.onMouseLeave = () => {
            this.isHovering = false;
            if (this.editor.selection.has(this.id)) {
                return void 0;
            }
            this.editor.canvas.mask.drawingEffect(this.range);
        };
        this.drawingMask = (ctx) => {
            if (this.isHovering &&
                // FIX: 避免全选删除后的 Hover 绘制
                this.editor.deltaSet.has(this.id) &&
                !this.editor.selection.has(this.id) &&
                !this.editor.state.get(EDITOR_STATE.MOUSE_DOWN)) {
                const { x, y, width, height } = this.range.rect();
                Shape.frame(ctx, {
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    borderColor: BLUE_4,
                });
            }
        };
        this.id = state.id;
        const delta = state.toDelta();
        const rect = delta.getRect();
        this.setZ(rect.z);
        this.isHovering = false;
    }
}
