import { isString } from "sketching-utils";
export class DeltaSet {
    constructor(options) {
        this.deltas = {};
        Object.entries(options).forEach(([id, delta]) => {
            const instance = DeltaSet.create(delta);
            if (instance) {
                instance.getDeltaSet = () => this;
                this.deltas[id] = instance;
            }
        });
    }
    getDeltas() {
        return Object.keys(this.deltas)
            .filter(key => this.deltas[key])
            .reduce((pre, cur) => (Object.assign(Object.assign({}, pre), { [cur]: this.deltas[cur].toJSON() })), {});
    }
    /**
     * 通过 key 获取 delta
     * @param key
     * @returns
     */
    get(key) {
        return this.deltas[key] || null;
    }
    /**
     * 判断是否存在目标 key
     * @param key
     * @returns
     */
    has(key) {
        return !!this.deltas[key];
    }
    /**
     * 添加目标 Delta 到 DeltaSet
     * @param delta 目标 Delta
     * @param to 目标 Delta 的父 Delta Id
     * @returns
     */
    add(delta, to) {
        this.deltas[delta.id] = delta;
        delta.getDeltaSet = () => this;
        if (to) {
            const delta = this.get(to);
            delta && delta.insert(delta);
        }
        return this;
    }
    remove(params, from) {
        const id = isString(params) ? params : params.id;
        delete this.deltas[id];
        if (from) {
            const delta = this.get(from);
            delta && delta.removeChild(delta);
        }
        return this;
    }
    forEach(cb) {
        for (const [id, delta] of Object.entries(this.deltas)) {
            cb(id, delta);
        }
    }
    toJSON() {
        return this.getDeltas();
    }
    static register(delta) {
        if (!delta.KEY) {
            throw new TypeError("Please implements DeltaStatic Type");
        }
        DeltaSet.DeltaTypeStore[delta.KEY] = delta;
    }
    static create(delta) {
        const DeltaType = DeltaSet.DeltaTypeStore[delta.key];
        return DeltaType ? DeltaType.create(delta) : null;
    }
}
DeltaSet.DeltaTypeStore = {};
