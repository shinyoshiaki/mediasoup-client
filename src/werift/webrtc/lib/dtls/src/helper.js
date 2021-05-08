"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.divide = exports.sleep = exports.enumerate = void 0;
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
//# sourceMappingURL=helper.js.map