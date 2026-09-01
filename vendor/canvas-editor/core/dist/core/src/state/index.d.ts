import type { OpSetType } from "sketching-delta";
import { DeltaSet } from "sketching-delta";
import { ROOT_DELTA } from "sketching-utils";
import type { Editor } from "../editor";
import { DeltaState } from "./modules/node";
import { Shortcut } from "./modules/shortcut";
import { EDITOR_STATE } from "./utils/constant";
import type { ApplyOptions } from "./utils/types";
export declare class EditorState {
    private editor;
    entry: DeltaState;
    readonly shortcut: Shortcut;
    private status;
    private deltas;
    constructor(editor: Editor);
    destroy(): void;
    private createDeltaStateTree;
    get(key: keyof typeof EDITOR_STATE): boolean | undefined;
    set(key: keyof typeof EDITOR_STATE, value: boolean): this;
    setContent(deltaSet: DeltaSet): void;
    getDeltasMap(): Map<string, DeltaState>;
    getDeltaStateParentId(id: string): string;
    getDeltaState(deltaId: typeof ROOT_DELTA): DeltaState;
    getDeltaState(deltaId: string): DeltaState | null;
    setReadOnly(next: boolean): undefined;
    apply(op: OpSetType, applyOptions?: ApplyOptions): void;
}
