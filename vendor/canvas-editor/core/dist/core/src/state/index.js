import { DeltaSet, OP_TYPE } from "sketching-delta";
import { ROOT_DELTA } from "sketching-utils";
import { EntryDelta } from "../editor/delta/entry";
import { DEFAULT_DELTA_LIKE } from "../editor/utils/constant";
import { EDITOR_EVENT } from "../event/bus/action";
import { Range } from "../selection/modules/range";
import { DeltaState } from "./modules/node";
import { Shortcut } from "./modules/shortcut";
import { APPLY_SOURCE, EDITOR_STATE } from "./utils/constant";
export class EditorState {
    constructor(editor) {
        this.editor = editor;
        this.status = new Map();
        this.deltas = new Map();
        // Verify DeltaSet Rules
        const entryDelta = this.editor.deltaSet.get(ROOT_DELTA);
        const entry = entryDelta || new EntryDelta(DEFAULT_DELTA_LIKE);
        this.deltas.set(entry.id, new DeltaState(editor, entry));
        this.entry = this.getDeltaState(ROOT_DELTA);
        this.createDeltaStateTree();
        this.shortcut = new Shortcut(editor);
    }
    destroy() {
        this.shortcut.destroy();
    }
    createDeltaStateTree() {
        // 初始化构建整个`Delta`状态树
        const dfs = (delta) => {
            const state = this.getDeltaState(delta.id);
            if (!state)
                return void 0;
            delta.children.forEach(id => {
                const child = this.editor.deltaSet.get(id);
                if (!child)
                    return void 0;
                // 按需创建`state`以及关联关系
                const childState = new DeltaState(this.editor, child);
                this.deltas.set(id, childState);
                state.addChild(childState);
                dfs(childState.toDelta());
            });
        };
        dfs(this.entry.toDelta());
    }
    get(key) {
        return this.status.get(key);
    }
    set(key, value) {
        this.status.set(key, value);
        return this;
    }
    setContent(deltaSet) {
        this.editor.deltaSet = deltaSet;
        this.editor.canvas.mask.clearWithOp();
        this.deltas.clear();
        this.editor.history.clear();
        const entryDelta = deltaSet.get(ROOT_DELTA);
        const entry = entryDelta || new EntryDelta(DEFAULT_DELTA_LIKE);
        this.deltas.set(entry.id, new DeltaState(this.editor, entry));
        this.entry = this.getDeltaState(ROOT_DELTA);
        this.createDeltaStateTree();
        this.editor.canvas.root.createNodeStateTree();
        this.editor.canvas.reset();
    }
    getDeltasMap() {
        return this.deltas;
    }
    getDeltaStateParentId(id) {
        const state = this.editor.state.getDeltaState(id);
        const parent = state && state.parent;
        const parentId = (parent && parent.id) || ROOT_DELTA;
        return parentId;
    }
    getDeltaState(deltaId) {
        return this.deltas.get(deltaId) || null;
    }
    setReadOnly(next) {
        const prev = !!this.editor.state.get(EDITOR_STATE.READONLY);
        if (prev === next)
            return void 0;
        next && this.editor.canvas.mask.clearWithOp();
        this.editor.state.set(EDITOR_STATE.READONLY, next);
        this.editor.event.trigger(EDITOR_EVENT.READONLY_CHANGE, { prev, next });
    }
    apply(op, applyOptions) {
        const options = applyOptions || { source: APPLY_SOURCE.USER, undoable: true };
        const previous = new DeltaSet(this.editor.deltaSet.getDeltas());
        const changes = [];
        switch (op.type) {
            case OP_TYPE.INSERT: {
                const { delta, parentId } = op.payload;
                const target = this.getDeltaState(parentId);
                const state = new DeltaState(this.editor, delta);
                this.deltas.set(delta.id, state);
                target && target.insert(state);
                changes.push(state.id);
                break;
            }
            case OP_TYPE.DELETE: {
                const { id } = op.payload;
                const target = this.getDeltaState(id);
                target && target.remove();
                this.deltas.delete(id);
                this.editor.selection.removeActiveDelta(id);
                changes.push(id);
                break;
            }
            case OP_TYPE.MOVE: {
                const { x, y, ids } = op.payload;
                ids.forEach(id => {
                    const target = this.getDeltaState(id);
                    target && target.move(x, y);
                    changes.push(id);
                });
                break;
            }
            case OP_TYPE.RESIZE: {
                const { id, x, y, width, height } = op.payload;
                const target = this.getDeltaState(id);
                target && target.resize(Range.from(x, y, x + width, y + height));
                changes.push(id);
                break;
            }
            case OP_TYPE.REVISE: {
                const { id, attrs, z } = op.payload;
                const target = this.getDeltaState(id);
                target && target.revise(attrs, z);
                changes.push(id);
                break;
            }
        }
        this.editor.event.trigger(EDITOR_EVENT.CONTENT_CHANGE, {
            previous,
            current: this.editor.deltaSet,
            changes: op,
            options,
        });
        Promise.resolve().then(() => {
            const effects = changes;
            let range = null;
            effects.forEach(id => {
                const prev = previous.get(id);
                if (prev) {
                    const current = Range.from(prev);
                    range = range ? range.compose(current) : current;
                }
                const state = this.getDeltaState(id);
                if (state) {
                    const current = state.toRange();
                    range = range ? range.compose(current) : current;
                }
            });
            range && this.editor.canvas.graph.drawingEffect(range);
        });
    }
}
