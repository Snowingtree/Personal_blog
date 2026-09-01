export declare const RESIZE_OFS = 6;
export declare const RESIZE_LEN = 12;
export declare const SELECT_BIAS = 3;
export declare const REFER_BIAS = 5;
export declare const FINE_TUNE = 0.5;
export declare const THE_CONFIG: readonly [30, {
    readonly trailing: false;
}];
export declare const MAX_Z_INDEX = 999999;
export declare const DRAG_KEY = "DATA";
export declare const RESIZE_TYPE: {
    readonly L: "L";
    readonly R: "R";
    readonly T: "T";
    readonly B: "B";
    readonly LT: "LT";
    readonly RT: "RT";
    readonly LB: "LB";
    readonly RB: "RB";
};
export declare const CURSOR_TYPE: {
    GRAB: string;
    GRABBING: string;
};
export declare const CURSOR_STATE: {
    readonly [x: string]: "ew-resize" | "ns-resize" | "nwse-resize" | "nesw-resize" | "grab" | "grabbing";
    readonly L: "ew-resize";
    readonly R: "ew-resize";
    readonly T: "ns-resize";
    readonly B: "ns-resize";
    readonly LT: "nwse-resize";
    readonly RT: "nesw-resize";
    readonly LB: "nesw-resize";
    readonly RB: "nwse-resize";
};
