import type { Delta, DeltaAttributes } from "sketching-delta";
import type { Editor } from "../../editor";
import { Range } from "../../selection/modules/range";
export declare class DeltaState {
    private editor;
    private readonly delta;
    readonly id: string;
    readonly key: string;
    _parent: DeltaState | null;
    readonly children: DeltaState[];
    constructor(editor: Editor, delta: Delta);
    get parent(): DeltaState | null;
    setParent(parent: DeltaState | null): void;
    addChild(child: DeltaState): void;
    toRange(): Range;
    toDelta(): Delta;
    getAttr(key: string): string | null;
    getZ(): number;
    drawing(ctx: CanvasRenderingContext2D): void | Promise<Delta>;
    insert(state: DeltaState): this;
    remove(): this;
    move(x: number, y: number): this;
    resize(range: Range): this;
    revise(attrs: DeltaAttributes, z?: number): undefined;
}
