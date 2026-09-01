import { Node } from "../../canvas/dom/node";
import { DeltaState } from "./node";
export declare class NSBridge {
    static set(state: DeltaState, node: Node): void;
    static get(node: null): null;
    static get(node: Node): DeltaState | null;
    static get(node: DeltaState): Node | null;
}
