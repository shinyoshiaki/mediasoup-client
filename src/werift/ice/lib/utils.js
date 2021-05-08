"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.future = exports.PQueue = exports.difference = exports.bufferXor = exports.randomTransactionId = exports.randomString = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const rx_mini_1 = require("rx.mini");
const debug_1 = tslib_1.__importDefault(require("debug"));
const log = debug_1.default("werift/ice/utils");
function randomString(length) {
    return crypto_1.randomBytes(length).toString("hex").substring(0, length);
}
exports.randomString = randomString;
function randomTransactionId() {
    return crypto_1.randomBytes(12);
}
exports.randomTransactionId = randomTransactionId;
function bufferXor(a, b) {
    if (a.length !== b.length) {
        throw new TypeError("[webrtc-stun] You can not XOR buffers which length are different");
    }
    const length = a.length;
    const buffer = Buffer.allocUnsafe(length);
    for (let i = 0; i < length; i++) {
        buffer[i] = a[i] ^ b[i];
    }
    return buffer;
}
exports.bufferXor = bufferXor;
function difference(x, y) {
    return new Set([...x].filter((e) => !y.has(e)));
}
exports.difference = difference;
// infinite size queue
class PQueue {
    constructor() {
        this.queue = [];
        this.wait = new rx_mini_1.Event();
    }
    put(v) {
        this.queue.push(v);
        if (this.queue.length === 1) {
            this.wait.execute(v);
        }
    }
    get() {
        const v = this.queue.shift();
        if (!v) {
            return new Promise((r) => {
                this.wait.subscribe((v) => {
                    this.queue.shift();
                    r(v);
                });
            });
        }
        return v;
    }
}
exports.PQueue = PQueue;
const future = (pCancel) => {
    const state = { done: false };
    const cancel = () => pCancel.cancel();
    const done = () => state.done;
    pCancel
        .then(() => {
        state.done = true;
    })
        .catch((error) => {
        if (error !== "cancel") {
            log("future", error);
        }
    });
    return { cancel, promise: pCancel, done };
};
exports.future = future;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
exports.sleep = sleep;
//# sourceMappingURL=utils.js.map