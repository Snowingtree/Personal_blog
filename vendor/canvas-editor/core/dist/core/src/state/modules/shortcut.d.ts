import type { Editor } from "../../editor";
export declare class Shortcut {
    private editor;
    constructor(editor: Editor);
    destroy(): void;
    onKeydown: (e: KeyboardEvent) => undefined;
    onKeyup: (e: KeyboardEvent) => void;
    onSelectionMove: (x: number, y: number) => void;
}
