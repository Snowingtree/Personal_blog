import { DEFAULT_PRIORITY } from "sketching-utils";
export class EventBus {
    constructor() {
        this.listeners = {};
    }
    on(key, listener, priority = DEFAULT_PRIORITY) {
        this.addEventListener(key, listener, priority, false);
    }
    once(key, listener, priority = DEFAULT_PRIORITY) {
        this.addEventListener(key, listener, priority, true);
    }
    addEventListener(key, listener, priority, once) {
        const handler = this.listeners[key] || [];
        !handler.some(item => item.listener === listener) && handler.push({ listener, priority, once });
        handler.sort((a, b) => a.priority - b.priority);
        this.listeners[key] = handler;
    }
    off(key, listener) {
        const handler = this.listeners[key];
        if (!handler)
            return void 0;
        // COMPAT: 不能直接`splice` 可能会导致`trigger`时打断`forEach`
        const next = handler.filter(item => item.listener !== listener);
        this.listeners[key] = next;
    }
    trigger(key, value) {
        const handler = this.listeners[key];
        if (!handler)
            return void 0;
        handler.forEach(item => {
            item.listener(value);
            item.once && this.off(key, item.listener);
        });
    }
    clear() {
        this.listeners = {};
    }
}
