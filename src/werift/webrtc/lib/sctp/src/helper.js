"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventsFromList = exports.sleep = exports.enumerate = void 0;
const tslib_1 = require("tslib");
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
function enumerate(arr) {
    return arr.map((v, i) => [i, v]);
}
exports.enumerate = enumerate;
async function sleep(ms) {
    await new Promise((r) => setTimeout(r, ms));
}
exports.sleep = sleep;
function createEventsFromList(list) {
    return list.reduce((acc, cur) => {
        acc[cur] = new rx_mini_1.default();
        return acc;
    }, {});
}
exports.createEventsFromList = createEventsFromList;
//# sourceMappingURL=helper.js.map