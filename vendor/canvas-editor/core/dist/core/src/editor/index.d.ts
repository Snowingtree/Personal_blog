import { DeltaSet } from "sketching-delta";
import { Canvas } from "../canvas";
import { Clipboard } from "../clipboard";
import { Event } from "../event";
import { History } from "../history/";
import { Logger } from "../log";
import { Selection } from "../selection";
import { EditorState } from "../state";
import type { EditorOptions } from "./utils/types";
export declare class Editor {
    deltaSet: DeltaSet;
    readonly state: EditorState;
    readonly event: Event;
    readonly logger: Logger;
    readonly canvas: Canvas;
    readonly selection: Selection;
    readonly history: History;
    readonly clipboard: Clipboard;
    private container;
    constructor(options?: EditorOptions);
    onMount(container: HTMLDivElement): void;
    destroy(): void;
    getContainer(): HTMLDivElement;
}
