import type { Delta } from "./delta";
import type { DeltaLike, DeltaSetLike, DeltaStatic, StrictDeltaSetLike } from "./types";
export declare class DeltaSet {
    private deltas;
    constructor(options: DeltaSetLike);
    getDeltas(): StrictDeltaSetLike;
    /**
     * 通过 key 获取 delta
     * @param key
     * @returns
     */
    get(key: string): Delta;
    /**
     * 判断是否存在目标 key
     * @param key
     * @returns
     */
    has(key: string): boolean;
    /**
     * 添加目标 Delta 到 DeltaSet
     * @param delta 目标 Delta
     * @param to 目标 Delta 的父 Delta Id
     * @returns
     */
    add(delta: Delta, to?: string): this;
    remove(id: string, from?: string): this;
    remove(delta: Delta, from?: string): this;
    forEach(cb: (id: string, delta: Delta) => void): void;
    toJSON(): StrictDeltaSetLike;
    private static DeltaTypeStore;
    static register(delta: DeltaStatic): void;
    static create(delta: DeltaLike): Delta | null;
}
