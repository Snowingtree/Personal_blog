import { Delta } from "sketching-delta";
import { TSON } from "sketching-utils";
import { TEXT_ATTRS } from "./constant";
import { RichText } from "./rich-text";
const text = new RichText();
export class Text extends Delta {
    constructor() {
        super(...arguments);
        this.key = Text.KEY;
        this.drawing = (ctx) => {
            const lines = [];
            const data = this.getAttr(TEXT_ATTRS.DATA);
            const blocks = data && TSON.parse(data);
            if (!data || !blocks) {
                const plain = "选中以编辑...";
                const line = plain.split("").map(char => ({ char, config: {} }));
                lines.push({ chars: line, config: {} });
            }
            else {
                lines.push(...blocks);
            }
            const matrices = text.parse(lines, this.width);
            text.render(matrices, ctx, this.x, this.y, this.width, this.height);
        };
    }
}
Text.KEY = "text";
Text.create = (options) => new Text(options);
