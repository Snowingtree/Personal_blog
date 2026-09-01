import type { Attributes, RichTextLines, TextMatrices } from "./types";
export declare class RichText {
    private ctx;
    private map;
    constructor();
    private getFont;
    measure: (text: string, config: Attributes) => {
        metric: TextMetrics | undefined;
        font: string;
    };
    parse: (lines: RichTextLines, width: number) => TextMatrices;
    render: (matrices: TextMatrices, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => void;
}
