import type { EventMap, EventMapKeys } from "./action";
type Listener<T extends EventMapKeys> = (value: EventMap[T]) => void;
export declare class EventBus {
    private listeners;
    on<T extends EventMapKeys>(key: T, listener: Listener<T>, priority?: number): void;
    once<T extends EventMapKeys>(key: T, listener: Listener<T>, priority?: number): void;
    private addEventListener;
    off<T extends EventMapKeys>(key: T, listener: Listener<T>): undefined;
    trigger<T extends EventMapKeys>(key: T, value: EventMap[T]): undefined;
    clear(): void;
}
export {};
