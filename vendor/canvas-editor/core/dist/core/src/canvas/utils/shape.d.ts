export type RectProps = {
    x: number;
    y: number;
    width: number;
    height: number;
    borderWidth?: number;
    borderColor?: string;
    fillColor?: string;
};
export type ArcProps = {
    x: number;
    y: number;
    radius: number;
    borderWidth?: number;
    borderColor?: string;
    fillColor?: string;
};
export type FrameProps = {
    x: number;
    y: number;
    width: number;
    height: number;
    borderColor: string;
};
export declare class Shape {
    /**
     * 绘制矩形
     * @param ctx
     * @param options
     */
    static rect(ctx: CanvasRenderingContext2D, options: RectProps): void;
    /**
     * 绘制圆形
     * @param ctx
     * @param options
     */
    static arc(ctx: CanvasRenderingContext2D, options: ArcProps): void;
    /**
     * 绘制框选
     * @param ctx
     * @param options
     */
    static frame(ctx: CanvasRenderingContext2D, options: FrameProps): void;
}
