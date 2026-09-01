import type { DeltaLike } from "sketching-delta";
import { Delta } from "sketching-delta";
export declare class EntryDelta extends Delta {
    static KEY: string;
    key: string;
    drawing: () => undefined;
    static create: (options: DeltaLike) => EntryDelta;
}
