import type { Editor } from "../editor";
import { Range } from "../selection/modules/range";
import { Graph } from "./paint/graph";
import { Mask } from "./paint/mask";
import { Grab } from "./state/grab";
import { Insert } from "./state/insert";
import { Root } from "./state/root";
export declare class Canvas {
    protected editor: Editor;
    private width;
    private height;
    private offsetX;
    private offsetY;
    readonly root: Root;
    readonly grab: Grab;
    readonly mask: Mask;
    readonly graph: Graph;
    readonly insert: Insert;
    private resizeObserver;
    readonly devicePixelRatio: number;
    constructor(editor: Editor);
    onMount(): void;
    destroy(): void;
    reset(): void;
    private onResizeBasic;
    private onResize;
    setOffset(x: number, y: number): void;
    getRect(): {
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
    };
    isOutside(range: Range): boolean;
    isActive(): boolean;
    /**
     * 判断是否默认模式
     * @description 根据状态判断拖拽、插入状态
     */
    isDefaultMode(): boolean;
}
