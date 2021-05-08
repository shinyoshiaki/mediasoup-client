"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventTarget = exports.PromiseQueue = exports.divide = exports.sleep = exports.enumerate = void 0;
const tslib_1 = require("tslib");
const events_1 = tslib_1.__importDefault(require("events"));
function enumerate(arr) {
    return arr.map((v, i) => [i, v]);
}
exports.enumerate = enumerate;
async function sleep(ms) {
    await new Promise((r) => setTimeout(r, ms));
}
exports.sleep = sleep;
function divide(from, split) {
    const arr = from.split(split);
    return [arr[0], arr.slice(1).join(split)];
}
exports.divide = divide;
class PromiseQueue {
    constructor() {
        this.queue = [];
        this.running = false;
        this.push = (promise) => new Promise((r) => {
            this.queue.push({ promise, call: r });
            if (!this.running)
                this.run();
        });
    }
    async run() {
        const task = this.queue.shift();
        if (task) {
            this.running = true;
            await task.promise();
            task.call();
            this.run();
        }
        else {
            this.running = false;
        }
    }
}
exports.PromiseQueue = PromiseQueue;
class EventTarget extends events_1.default {
    constructor() {
        super(...arguments);
        this.addEventListener = (type, listener) => {
            this.addListener(type, listener);
        };
    }
}
exports.EventTarget = EventTarget;
//# sourceMappingURL=helper.js.map