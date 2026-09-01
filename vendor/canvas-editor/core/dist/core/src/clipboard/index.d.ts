import type { Editor } from "../editor";
export declare class Clipboard {
    private editor;
    static KEY: string;
    constructor(editor: Editor);
    destroy(): void;
    private copyFromCanvas;
    private onCopy;
    private onCut;
    private onPaste;
}
