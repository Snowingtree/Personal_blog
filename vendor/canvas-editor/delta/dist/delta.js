import { getUniqueId, isString } from "sketching-utils";
export class Delta {
    constructor(options) {
        const { id, x, y, z, width, height } = options;
        this.id = id || getUniqueId();
        this.x = x;
        this.y = y;
        this.z = z || 0;
        this.width = width;
        this.height = height;
        this.attrs = options.attrs || {};
        this.children = [...(options.children || [])];
    }
    insert(delta) {
        this.children.push(delta.id);
        return this;
    }
    removeChild(params) {
        const id = isString(params) ? params : params.id;
        this.children.splice(this.children.indexOf(id), 1);
        return this;
    }
    setRect(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        return this;
    }
    move(x, y) {
        this.x = x + this.x;
        this.y = y + this.y;
        const deltaSet = this.getDeltaSet && this.getDeltaSet();
        if (deltaSet) {
            this.children.forEach(id => {
                const delta = deltaSet.get(id);
                delta && delta.move(x, y);
            });
        }
        return this;
    }
    moveTo(x, y) {
        const diffX = x - this.x;
        const diffY = y - this.y;
        this.move(diffX, diffY);
        return this;
    }
    getAttr(key) {
        return this.attrs[key];
    }
    setAttr(key, value) {
        if (!value) {
            delete this.attrs[key];
        }
        else {
            this.attrs[key] = String(value);
        }
        return this;
    }
    getArea() {
        return this.width * this.height;
    }
    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height, z: this.z };
    }
    getZ() {
        return this.z;
    }
    setZ(z) {
        this.z = z;
    }
    clone() {
        // @ts-expect-error constructor type
        return new this.constructor(this.toJSON());
    }
    toJSON() {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
            id: this.id,
            key: this.key,
            width: this.width,
            height: this.height,
            attrs: Object.assign({}, this.attrs),
            children: Array.from(this.children),
        };
    }
}
