import type { Editor } from "../../editor";
import { Range } from "../../selection/modules/range";
import { Node } from "./node";
export declare class ReferNode extends Node {
    private editor;
    private matched;
    private dragged;
    private sortedX;
    private sortedY;
    private xLineMap;
    private yLineMap;
    constructor(editor: Editor);
    setRange(): void;
    private addToMap;
    onMouseDownController: () => undefined;
    /**
     * 拖拽选区的鼠标移动事件
     * @param latest 拖拽选区的最新 Range
     * @description 作为 SelectNode 的子元素 Node 事件
     * 基于父元素的事件调用链执行当前的事件绑定
     * 避免多次对父元素的 Range 修改来保证值唯一
     */
    onMouseMoveController: (latest: Range) => {
        x: number;
        y: number;
    } | undefined;
    onMouseUpController: () => void;
    private getClosestVal;
    private isNear;
    private clear;
    drawingMaskDispatch: (ctx: CanvasRenderingContext2D) => undefined;
}
