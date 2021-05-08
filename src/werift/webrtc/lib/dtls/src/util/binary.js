"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeBuffer = void 0;
const binary_data_1 = require("binary-data");
function encodeBuffer(obj, spec) {
    return Buffer.from(binary_data_1.encode(obj, spec).slice());
}
exports.encodeBuffer = encodeBuffer;
//# sourceMappingURL=binary.js.map