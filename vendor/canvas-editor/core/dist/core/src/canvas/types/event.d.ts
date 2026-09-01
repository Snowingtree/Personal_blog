import type { MouseEvent } from "../event/mouse";
export type EventOptions = {
    bubble?: boolean;
    capture?: boolean;
};
export declare const NODE_EVENT: {
    readonly MOUSE_DOWN: "onMouseDown";
    readonly MOUSE_UP: "onMouseUp";
    readonly MOUSE_ENTER: "onMouseEnter";
    readonly MOUSE_LEAVE: "onMouseLeave";
};
export type NodeEvent = {
    [NODE_EVENT.MOUSE_DOWN]: MouseEvent;
    [NODE_EVENT.MOUSE_UP]: MouseEvent;
    [NODE_EVENT.MOUSE_ENTER]: MouseEvent;
    [NODE_EVENT.MOUSE_LEAVE]: MouseEvent;
};
