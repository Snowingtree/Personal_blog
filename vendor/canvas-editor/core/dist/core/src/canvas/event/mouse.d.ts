import type { Editor } from "../../editor";
import type { EventOptions } from "../types/event";
import { Event } from "./basic";
export declare class MouseEvent extends Event {
    readonly x: number;
    readonly y: number;
    readonly clientX: number;
    readonly clientY: number;
    readonly metaKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly altKey: boolean;
    readonly native: globalThis.MouseEvent;
    constructor(event: globalThis.MouseEvent, offsetX: number, offsetY: number, options?: EventOptions);
    static from(event: globalThis.MouseEvent, editor: Editor): MouseEvent;
}
