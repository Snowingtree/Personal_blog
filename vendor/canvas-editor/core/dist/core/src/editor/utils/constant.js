import { ROOT_DELTA } from "sketching-utils";
import { EntryDelta } from "../delta/entry";
export const DEFAULT_DELTA_LIKE = {
    x: -999999,
    y: -999999,
    width: 0,
    height: 0,
    key: EntryDelta.KEY,
};
export const DEFAULT_DELTA_SET_LIKE = {
    [ROOT_DELTA]: DEFAULT_DELTA_LIKE,
};
