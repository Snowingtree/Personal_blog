import type { Attributes, RichTextLine, TextMatrix, TextMatrixItem } from "./types";
export declare const getLineOffset: (line: RichTextLine) => number;
export declare const drawingList: (ctx: CanvasRenderingContext2D, attrs: Attributes, offsetX: number, middleOffsetY: number, offsetYBaseLine: number) => undefined;
export declare const drawingDividingLine: (ctx: CanvasRenderingContext2D, matrix: TextMatrix, width: number, offsetX: number, offsetY: number) => boolean;
export declare const HORIZONTAL_PADDING = 1;
export declare const drawingBackground: (ctx: CanvasRenderingContext2D, matrix: TextMatrix, item: TextMatrixItem, i: number, halfGap: number, offsetX: number, offsetYBaseLine: number) => void;
export declare const drawingUnderline: (ctx: CanvasRenderingContext2D, matrix: TextMatrix, item: TextMatrixItem, halfGap: number, offsetX: number, offsetYBaseLine: number) => void;
export declare const drawingStrikeThrough: (ctx: CanvasRenderingContext2D, item: TextMatrixItem, halfGap: number, offsetX: number, middleOffsetY: number) => void;
export declare const drawingDebugLine: (ctx: CanvasRenderingContext2D, matrix: TextMatrix, item: TextMatrixItem, halfGap: number, offsetX: number, offsetY: number, offsetYBaseLine: number) => void;
