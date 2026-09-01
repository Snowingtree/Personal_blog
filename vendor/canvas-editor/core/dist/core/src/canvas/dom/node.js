export class Node {
    constructor(range) {
        this._z = 0;
        this.children = [];
        this._range = range;
        this._parent = null;
        this.flatNodes = null;
        this._ignoreEvent = false;
    }
    // ====== Parent ======
    get parent() {
        return this._parent;
    }
    setParent(parent) {
        this._parent = parent;
    }
    // ====== Range ======
    get range() {
        return this._range;
    }
    setRange(range) {
        this._range = range;
    }
    // ====== Z-Index ======
    get z() {
        return this._z;
    }
    setZ(z) {
        if (this.z !== z) {
            this._z = z;
            const parent = this._parent;
            if (parent) {
                // 先移除后添加保证顺序
                parent.removeChild(this);
                parent.append(this);
            }
        }
    }
    // ====== Event ======
    get ignoreEvent() {
        return this._ignoreEvent;
    }
    setIgnoreEvent(ignoreEvent) {
        this._ignoreEvent = ignoreEvent;
    }
    // ====== DOM OP ======
    append(node) {
        if (!node)
            return void 0;
        // 类似希尔排序 保证`children`有序 `zIndex`升序
        // 如果使用`sort`也可以 `ES`规范添加了`sort`作为稳定排序
        const index = this.children.findIndex(item => item.z > node.z);
        if (index > -1) {
            this.children.splice(index, 0, node);
        }
        else {
            this.children.push(node);
        }
        node.setParent(this);
        this.clearFlatNodeOnLink();
    }
    removeChild(node) {
        if (!node)
            return void 0;
        const index = this.children.indexOf(node);
        if (index > -1) {
            this.children.splice(index, 1);
        }
        this.clearFlatNodeOnLink();
    }
    remove() {
        const parent = this._parent;
        if (parent) {
            const index = parent.children.indexOf(this);
            if (index > -1) {
                this.children.splice(index, 1);
            }
            this.clearFlatNodeOnLink();
        }
    }
    clearNodes() {
        this.children.length = 0;
        this.clearFlatNodeOnLink();
    }
    /**
     * 获取当前节点树的所有子节点
     * @returns
     */
    getFlatNode() {
        if (this.flatNodes) {
            return this.flatNodes;
        }
        // 右子树优先后序遍历 保证事件调用的顺序
        const nodes = [];
        const reverse = [...this.children].reverse();
        reverse.forEach(node => {
            nodes.push(...node.getFlatNode());
            nodes.push(node);
        });
        this.flatNodes = nodes;
        return nodes;
    }
    clearFlatNode() {
        this.flatNodes = null;
    }
    clearFlatNodeOnLink() {
        this.clearFlatNode();
        let node = this.parent;
        while (node) {
            node.clearFlatNode();
            node = node.parent;
        }
    }
}
