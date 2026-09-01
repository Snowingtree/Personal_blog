import { Node } from "../../canvas/dom/node";
import { DeltaState } from "./node";
const NODE_TO_STATE = new WeakMap();
const STATE_TO_NODE = new WeakMap();
export class NSBridge {
    static set(state, node) {
        NODE_TO_STATE.set(node, state);
        STATE_TO_NODE.set(state, node);
    }
    static get(a) {
        if (a === null)
            return null;
        if (a instanceof DeltaState)
            return STATE_TO_NODE.get(a) || null;
        if (a instanceof Node)
            NODE_TO_STATE.get(a) || null;
        return null;
    }
}
