import { ROOT_DELTA } from "sketching-utils";
import { EDITOR_EVENT } from "../event/bus/action";
import { EDITOR_STATE } from "../state/utils/constant";
import { Range } from "./modules/range";
export class Selection {
    constructor(editor) {
        this.editor = editor;
        /** 选中的 Delta Id 组 */
        this.active = new Set();
        this.current = null;
    }
    destroy() {
        // placeholder
    }
    has(id) {
        return this.active.has(id);
    }
    get() {
        return this.current;
    }
    set(range) {
        // 只读状态下无选区
        if (this.editor.state.get(EDITOR_STATE.READONLY))
            return this;
        const previous = this.current;
        if (Range.isEqual(previous, range))
            return this;
        this.current = range;
        this.editor.event.trigger(EDITOR_EVENT.SELECTION_CHANGE, {
            previous,
            current: range,
        });
        return this;
    }
    getActiveDeltaIds() {
        return this.active;
    }
    addActiveDelta(deltaId) {
        if (this.active.has(deltaId))
            return void 0;
        this.active.add(deltaId);
        this.compose();
    }
    removeActiveDelta(deltaId) {
        if (!this.active.has(deltaId))
            return void 0;
        this.active.delete(deltaId);
        this.compose();
    }
    setActiveDelta(...deltaIds) {
        this.active.clear();
        deltaIds.forEach(id => this.active.add(id));
        this.compose();
    }
    /**
     * 清理选区内容
     * @returns
     */
    clearActiveDeltas() {
        if (this.active.size === 0) {
            return void 0;
        }
        this.active.clear();
        this.set(null);
    }
    selectAll() {
        const map = this.editor.state.getDeltasMap();
        const keys = Array.from(map.keys()).filter(key => key !== ROOT_DELTA);
        this.setActiveDelta(...keys);
    }
    /**
     * 组合当前选区节点的 Range
     * @returns
     */
    compose() {
        const active = this.active;
        if (active.size === 0) {
            this.set(null);
            return void 0;
        }
        let range = null;
        active.forEach(key => {
            const delta = this.editor.deltaSet.get(key);
            if (!delta)
                return void 0;
            const deltaRange = Range.from(delta);
            range = range ? range.compose(deltaRange) : deltaRange;
        });
        this.set(range);
    }
}
