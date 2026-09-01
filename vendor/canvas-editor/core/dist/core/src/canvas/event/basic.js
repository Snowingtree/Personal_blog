export class Event {
    constructor(options) {
        const { bubble = true, capture = false } = options || {};
        this.bubble = bubble;
        this.capture = capture;
    }
    stop() {
        this.bubble = false;
    }
}
