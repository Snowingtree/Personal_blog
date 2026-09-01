import type { Empty } from "sketching-utils";
import type { Range } from "../../selection/modules/range";
import type { MouseEvent } from "../event/mouse";
export declare class Node {
    /** 节点 Range */
    private _range;
    /** 父节点引用 */
    private _parent;
    /** 层级 */
    protected _z: number;
    /** 忽略事件触发 */
    protected _ignoreEvent: boolean;
    /** 当前树结构的所有子节点 */
    protected flatNodes: Node[] | null;
    /** 当前节点的直属子节点 */
    readonly children: Node[];
    protected onMouseDown?: (event: MouseEvent) => void;
    protected onMouseUp?: (event: MouseEvent) => void;
    protected onMouseEnter?: (event: MouseEvent) => void;
    protected onMouseLeave?: (event: MouseEvent) => void;
    drawingMask?: (ctx: CanvasRenderingContext2D) => void;
    constructor(range: Range);
    get parent(): Node | null;
    setParent(parent: Node | null): void;
    get range(): Range;
    setRange(range: Range): void;
    get z(): number;
    setZ(z: number): void;
    get ignoreEvent(): boolean;
    setIgnoreEvent(ignoreEvent: boolean): void;
    append<T extends Node>(node: T | Empty): undefined;
    removeChild<T extends Node>(node: T | Empty): undefined;
    remove(): void;
    clearNodes(): void;
    /**
     * 获取当前节点树的所有子节点
     * @returns
     */
    getFlatNode(): Node[];
    clearFlatNode(): void;
    clearFlatNodeOnLink(): void;
}
