import type { DeltaSet } from "./delta-set";
import type { OpPayload, OpType } from "./types";
export declare class Op<T extends OpType> {
    readonly type: T;
    readonly payload: OpPayload[T];
    constructor(type: T, payload: OpPayload[T]);
    invert(prev: DeltaSet): Op<"DELETE"> | Op<"INSERT"> | Op<"MOVE"> | Op<"RESIZE"> | Op<"REVISE"> | null;
    static from<T extends OpType>(type: T, payload: OpPayload[T]): Op<T>;
}
