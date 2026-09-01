import type { Editor } from "../editor";
export declare class History {
    private editor;
    private readonly DELAY;
    private readonly STACK_SIZE;
    private temp;
    private undoStack;
    private redoStack;
    private timer;
    constructor(editor: Editor);
    destroy(): void;
    clear(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    private collectImmediately;
    private onContentChange;
    undo(): undefined;
    redo(): undefined;
}
