import { Delta, DeltaSet } from "sketching-delta";
export class EntryDelta extends Delta {
    constructor() {
        super(...arguments);
        this.key = EntryDelta.KEY;
        this.drawing = () => void 0;
    }
}
EntryDelta.KEY = "entry";
EntryDelta.create = (options) => new EntryDelta(options);
DeltaSet.register(EntryDelta);
