import { EventBus } from "./bus";
import { NativeEvent } from "./native";
export class Event {
    constructor(editor) {
        this.editor = editor;
        this.on = (key, listener, priority) => {
            return this.bus.on(key, listener, priority);
        };
        this.once = (key, listener, priority) => {
            return this.bus.once(key, listener, priority);
        };
        this.off = (key, listener) => {
            return this.bus.off(key, listener);
        };
        this.trigger = (key, payload) => {
            return this.bus.trigger(key, payload);
        };
        this.bus = new EventBus();
        this.nativeEvent = new NativeEvent(this.bus, this.editor);
    }
    bind() {
        return this.nativeEvent.bind();
    }
    unbind() {
        this.bus.clear();
        return this.nativeEvent.unbind();
    }
}
