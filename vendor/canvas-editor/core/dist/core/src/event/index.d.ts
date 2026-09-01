import type { Editor } from "../editor";
import { EventBus } from "./bus";
export declare class Event {
    private editor;
    private nativeEvent;
    private bus;
    constructor(editor: Editor);
    bind(): void;
    unbind(): void;
    on: EventBus["on"];
    once: EventBus["once"];
    off: EventBus["off"];
    trigger: EventBus["trigger"];
}
