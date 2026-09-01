import type { Editor } from "../editor";
import { Range } from "./modules/range";
export declare class Selection {
    protected editor: Editor;
    /** 当前选区 Range */
    private current;
    /** 选中的 Delta Id 组 */
    private active;
    constructor(editor: Editor);
    destroy(): void;
    has(id: string): boolean;
    get(): Range | null;
    set(range: Range | null): this;
    getActiveDeltaIds(): Set<string>;
    addActiveDelta(deltaId: string): undefined;
    removeActiveDelta(deltaId: string): undefined;
    setActiveDelta(...deltaIds: string[]): void;
    /**
     * 清理选区内容
     * @returns
     */
    clearActiveDeltas(): undefined;
    selectAll(): void;
    /**
     * 组合当前选区节点的 Range
     * @returns
     */
    compose(): undefined;
}
