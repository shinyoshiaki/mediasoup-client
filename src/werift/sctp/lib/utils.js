"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uint32Gte = exports.uint32Gt = exports.uint16Gte = exports.uint16Gt = exports.uint32_add = exports.uint16Add = exports.random32 = exports.random16 = void 0;
const crypto_1 = require("crypto");
const jspack_1 = require("jspack");
function random16() {
    return jspack_1.jspack.Unpack("!H", crypto_1.randomBytes(2))[0];
}
exports.random16 = random16;
function random32() {
    return BigInt(jspack_1.jspack.Unpack("!L", crypto_1.randomBytes(4))[0]);
}
exports.random32 = random32;
function uint16Add(a, b) {
    return (a + b) & 0xffff;
}
exports.uint16Add = uint16Add;
function uint32_add(a, b) {
    return (a + b) & 0xffffffffn;
}
exports.uint32_add = uint32_add;
function uint16Gt(a, b) {
    const halfMod = 0x8000;
    return (a < b && b - a > halfMod) || (a > b && a - b < halfMod);
}
exports.uint16Gt = uint16Gt;
function uint16Gte(a, b) {
    return a === b || uint16Gt(a, b);
}
exports.uint16Gte = uint16Gte;
function uint32Gt(a, b) {
    const halfMod = 0x80000000;
    return (a < b && b - a > halfMod) || (a > b && a - b < halfMod);
}
exports.uint32Gt = uint32Gt;
function uint32Gte(a, b) {
    return a === b || uint32Gt(a, b);
}
exports.uint32Gte = uint32Gte;
//# sourceMappingURL=utils.js.map