import type { EventOptions } from "../types/event";
export declare class Event {
    bubble: boolean;
    capture: boolean;
    constructor(options?: EventOptions);
    stop(): void;
}
