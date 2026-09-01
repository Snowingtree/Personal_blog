export class Shape {
    /**
     * 绘制矩形
     * @param ctx
     * @param options
     */
    static rect(ctx, options) {
        ctx.beginPath();
        ctx.rect(options.x, options.y, options.width, options.height);
        if (options.fillColor) {
            ctx.fillStyle = options.fillColor;
            ctx.fill();
        }
        if (options.borderColor) {
            ctx.strokeStyle = options.borderColor;
            ctx.lineWidth = options.borderWidth || 1;
            ctx.stroke();
        }
        ctx.closePath();
    }
    /**
     * 绘制圆形
     * @param ctx
     * @param options
     */
    static arc(ctx, options) {
        ctx.beginPath();
        ctx.arc(options.x, options.y, options.radius, 0, 2 * Math.PI);
        if (options.fillColor) {
            ctx.fillStyle = options.fillColor;
            ctx.fill();
        }
        if (options.borderColor) {
            ctx.strokeStyle = options.borderColor;
            ctx.lineWidth = options.borderWidth || 1;
            ctx.stroke();
        }
        ctx.closePath();
    }
    /**
     * 绘制框选
     * @param ctx
     * @param options
     */
    static frame(ctx, options) {
        // https://stackoverflow.com/questions/36615592/canvas-inner-stroke
        ctx.save();
        ctx.beginPath();
        const frame = [options.x - 1, options.y - 1, options.width + 2, options.height + 2];
        const inside = [options.x, options.y, options.width, options.height];
        const region = new Path2D();
        region.rect(...frame);
        region.rect(...inside);
        ctx.clip(region, "evenodd");
        ctx.rect(...frame);
        ctx.fillStyle = options.borderColor;
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }
}
