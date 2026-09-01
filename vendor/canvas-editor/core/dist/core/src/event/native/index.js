import { EDITOR_STATE } from "../../state/utils/constant";
import { MOUSE_BUTTON, NATIVE_EVENTS } from "./types";
export class NativeEvent {
    constructor(event, editor) {
        this.event = event;
        this.editor = editor;
        this.onCompositionStart = (e) => {
            this.editor.state.set(EDITOR_STATE.COMPOSING, true);
            this.event.trigger(NATIVE_EVENTS.COMPOSITION_START, e);
        };
        this.onCompositionUpdate = (e) => {
            this.event.trigger(NATIVE_EVENTS.COMPOSITION_UPDATE, e);
        };
        this.onCompositionEnd = (e) => {
            this.editor.state.set(EDITOR_STATE.COMPOSING, false);
            this.event.trigger(NATIVE_EVENTS.COMPOSITION_END, e);
        };
        this.onCopy = (e) => {
            if (!this.editor.canvas.isActive())
                return void 0;
            this.event.trigger(NATIVE_EVENTS.COPY, e);
        };
        this.onCut = (e) => {
            if (!this.editor.canvas.isActive())
                return void 0;
            this.event.trigger(NATIVE_EVENTS.CUT, e);
        };
        this.onPaste = (e) => {
            if (!this.editor.canvas.isActive())
                return void 0;
            this.event.trigger(NATIVE_EVENTS.PASTE, e);
        };
        this.onKeydown = (e) => {
            if (!this.editor.canvas.isActive())
                return void 0;
            this.event.trigger(NATIVE_EVENTS.KEY_DOWN, e);
        };
        this.onKeypress = (e) => {
            if (!this.editor.canvas.isActive())
                return void 0;
            this.event.trigger(NATIVE_EVENTS.KEY_PRESS, e);
        };
        this.onKeyup = (e) => {
            if (!this.editor.canvas.isActive())
                return void 0;
            this.event.trigger(NATIVE_EVENTS.KEY_UP, e);
        };
        this.onFocus = (e) => {
            this.editor.state.set(EDITOR_STATE.FOCUS, true);
            this.event.trigger(NATIVE_EVENTS.FOCUS, e);
        };
        this.onBlur = (e) => {
            this.editor.state.set(EDITOR_STATE.FOCUS, false);
            this.event.trigger(NATIVE_EVENTS.BLUR, e);
        };
        this.onMouseDown = (e) => {
            // 非鼠标主按键不认为是 MouseDown
            if (e.button !== MOUSE_BUTTON.MAIN)
                return void 0;
            this.editor.state.set(EDITOR_STATE.MOUSE_DOWN, true);
            this.event.trigger(NATIVE_EVENTS.MOUSE_DOWN, e);
        };
        this.onMouseMove = (e) => {
            if (e.button !== MOUSE_BUTTON.MAIN)
                return void 0;
            this.event.trigger(NATIVE_EVENTS.MOUSE_MOVE, e);
        };
        this.onMouseUp = (e) => {
            this.editor.state.set(EDITOR_STATE.MOUSE_DOWN, false);
            this.event.trigger(NATIVE_EVENTS.MOUSE_UP, e);
        };
        this.onMouseWheel = (e) => {
            this.event.trigger(NATIVE_EVENTS.MOUSE_WHEEL, e);
        };
        this.onMouseMoveGlobal = (e) => {
            if (e.button !== MOUSE_BUTTON.MAIN)
                return void 0;
            this.event.trigger(NATIVE_EVENTS.MOUSE_MOVE_GLOBAL, e);
        };
        this.onMouseUpGlobal = (e) => {
            this.editor.state.set(EDITOR_STATE.MOUSE_DOWN, false);
            this.event.trigger(NATIVE_EVENTS.MOUSE_UP_GLOBAL, e);
        };
        this.onDrop = (e) => {
            e.preventDefault();
            this.event.trigger(NATIVE_EVENTS.DROP, e);
        };
        this.onDropOver = (e) => {
            e.preventDefault();
        };
        this.onContextMenu = (e) => {
            e.preventDefault();
            this.event.trigger(NATIVE_EVENTS.CONTEXT_MENU, e);
        };
        this.onClick = (e) => {
            this.event.trigger(NATIVE_EVENTS.CLICK, e);
        };
    }
    bind() {
        this.unbind();
        const container = this.editor.getContainer();
        container.addEventListener(NATIVE_EVENTS.COMPOSITION_START, this.onCompositionStart);
        container.addEventListener(NATIVE_EVENTS.COMPOSITION_UPDATE, this.onCompositionUpdate);
        container.addEventListener(NATIVE_EVENTS.COMPOSITION_END, this.onCompositionEnd);
        container.addEventListener(NATIVE_EVENTS.FOCUS, this.onFocus);
        container.addEventListener(NATIVE_EVENTS.BLUR, this.onBlur);
        container.addEventListener(NATIVE_EVENTS.MOUSE_DOWN, this.onMouseDown);
        container.addEventListener(NATIVE_EVENTS.MOUSE_MOVE, this.onMouseMove);
        container.addEventListener(NATIVE_EVENTS.MOUSE_UP, this.onMouseUp);
        container.addEventListener(NATIVE_EVENTS.MOUSE_WHEEL, this.onMouseWheel);
        container.addEventListener(NATIVE_EVENTS.DROP, this.onDrop);
        container.addEventListener(NATIVE_EVENTS.DROP_OVER, this.onDropOver);
        container.addEventListener(NATIVE_EVENTS.CONTEXT_MENU, this.onContextMenu);
        container.addEventListener(NATIVE_EVENTS.CLICK, this.onClick);
        document.addEventListener(NATIVE_EVENTS.COPY, this.onCopy);
        document.addEventListener(NATIVE_EVENTS.CUT, this.onCut);
        document.addEventListener(NATIVE_EVENTS.PASTE, this.onPaste);
        document.addEventListener(NATIVE_EVENTS.KEY_DOWN, this.onKeydown);
        document.addEventListener(NATIVE_EVENTS.KEY_PRESS, this.onKeypress);
        document.addEventListener(NATIVE_EVENTS.KEY_UP, this.onKeyup);
        document.addEventListener(NATIVE_EVENTS.MOUSE_MOVE, this.onMouseMoveGlobal);
        document.addEventListener(NATIVE_EVENTS.MOUSE_UP, this.onMouseUpGlobal);
    }
    unbind() {
        const container = this.editor.getContainer();
        container.removeEventListener(NATIVE_EVENTS.COMPOSITION_START, this.onCompositionStart);
        container.removeEventListener(NATIVE_EVENTS.COMPOSITION_UPDATE, this.onCompositionUpdate);
        container.removeEventListener(NATIVE_EVENTS.COMPOSITION_END, this.onCompositionEnd);
        container.removeEventListener(NATIVE_EVENTS.FOCUS, this.onFocus);
        container.removeEventListener(NATIVE_EVENTS.BLUR, this.onBlur);
        container.removeEventListener(NATIVE_EVENTS.MOUSE_DOWN, this.onMouseDown);
        container.removeEventListener(NATIVE_EVENTS.MOUSE_UP, this.onMouseUp);
        container.removeEventListener(NATIVE_EVENTS.MOUSE_MOVE, this.onMouseMove);
        container.removeEventListener(NATIVE_EVENTS.MOUSE_WHEEL, this.onMouseWheel);
        container.removeEventListener(NATIVE_EVENTS.DROP, this.onDrop);
        container.removeEventListener(NATIVE_EVENTS.DROP_OVER, this.onDropOver);
        container.removeEventListener(NATIVE_EVENTS.CONTEXT_MENU, this.onContextMenu);
        container.removeEventListener(NATIVE_EVENTS.CLICK, this.onClick);
        document.removeEventListener(NATIVE_EVENTS.COPY, this.onCopy);
        document.removeEventListener(NATIVE_EVENTS.CUT, this.onCut);
        document.removeEventListener(NATIVE_EVENTS.PASTE, this.onPaste);
        document.removeEventListener(NATIVE_EVENTS.KEY_DOWN, this.onKeydown);
        document.removeEventListener(NATIVE_EVENTS.KEY_PRESS, this.onKeypress);
        document.removeEventListener(NATIVE_EVENTS.KEY_UP, this.onKeyup);
        document.removeEventListener(NATIVE_EVENTS.MOUSE_MOVE, this.onMouseMoveGlobal);
        document.removeEventListener(NATIVE_EVENTS.MOUSE_UP, this.onMouseUpGlobal);
    }
}
