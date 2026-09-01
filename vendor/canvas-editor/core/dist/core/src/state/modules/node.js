import { isEmptyValue } from "sketching-utils";
import { ElementNode } from "../../canvas/dom/element";
import { Range } from "../../selection/modules/range";
import { NSBridge } from "./bridge";
export class DeltaState {
    constructor(editor, delta) {
        this.editor = editor;
        this.delta = delta;
        this.id = delta.id;
        this.key = delta.key;
        this._parent = null;
        this.children = [];
    }
    get parent() {
        return this._parent;
    }
    setParent(parent) {
        this._parent = parent;
    }
    addChild(child) {
        child.setParent(this);
        this.children.push(child);
    }
    toRange() {
        return Range.from(this.delta);
    }
    toDelta() {
        return this.delta;
    }
    getAttr(key) {
        return this.delta.getAttr(key);
    }
    getZ() {
        return this.delta.getZ();
    }
    drawing(ctx) {
        return this.delta.drawing(ctx);
    }
    insert(state) {
        const delta = state.delta;
        this.editor.deltaSet.add(delta);
        this.delta.insert(delta);
        state.setParent(this);
        this.children.push(state);
        const node = NSBridge.get(this);
        if (node) {
            const element = new ElementNode(this.editor, state);
            node.append(element);
            NSBridge.set(state, element);
        }
        else {
            this.editor.logger.warning(`Node Not Found - ${this.delta.id}`);
        }
        return this;
    }
    remove() {
        this.editor.deltaSet.remove(this.delta);
        const parent = this.parent;
        if (!parent)
            return this;
        parent.delta.removeChild(this.delta);
        parent.children.splice(parent.children.indexOf(this), 1);
        const node = NSBridge.get(parent);
        if (node) {
            node.removeChild(NSBridge.get(this));
        }
        else {
            this.editor.logger.warning(`Node Not Found - ${this.delta.id}`);
        }
        return this;
    }
    move(x, y) {
        this.delta.move(x, y);
        const node = NSBridge.get(this);
        if (node) {
            node.setRange(Range.from(this.delta));
        }
        else {
            this.editor.logger.warning(`Node Not Found - ${this.delta.id}`);
        }
        return this;
    }
    resize(range) {
        const { x, y, width, height } = range.rect();
        this.delta.setRect(x, y, width, height);
        const node = NSBridge.get(this);
        if (node) {
            node.setRange(range);
        }
        else {
            this.editor.logger.warning(`Node Not Found - ${this.delta.id}`);
        }
        return this;
    }
    revise(attrs, z) {
        for (const [key, value] of Object.entries(attrs)) {
            this.delta.setAttr(key, value);
        }
        const node = NSBridge.get(this);
        if (!node) {
            this.editor.logger.warning(`Node Not Found - ${this.delta.id}`);
            return void 0;
        }
        if (!isEmptyValue(z) && this.delta.getZ() !== z) {
            this.delta.setZ(z);
            node.setZ(z);
        }
    }
}
