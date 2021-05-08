"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBit = exports.BitWriter = void 0;
class BitWriter {
    constructor(bitLength) {
        this.bitLength = bitLength;
        this.value = 0;
    }
    set(size, startIndex, value) {
        value &= (1 << size) - 1;
        this.value |= value << (this.bitLength - size - startIndex);
        return this;
    }
}
exports.BitWriter = BitWriter;
function getBit(bits, startIndex, length = 1) {
    let bin = bits.toString(2).split("");
    bin = [...Array(8 - bin.length).fill("0"), ...bin];
    const s = bin.slice(startIndex, startIndex + length).join("");
    const v = parseInt(s, 2);
    return v;
}
exports.getBit = getBit;
//# sourceMappingURL=utils.js.map