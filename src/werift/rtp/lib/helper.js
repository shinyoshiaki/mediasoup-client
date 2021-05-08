"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Int = exports.growBufferSize = exports.bufferReader = exports.bufferWriter = exports.sleep = exports.enumerate = void 0;
function enumerate(arr) {
    return arr.map((v, i) => [i, v]);
}
exports.enumerate = enumerate;
async function sleep(ms) {
    await new Promise((r) => setTimeout(r, ms));
}
exports.sleep = sleep;
function bufferWriter(bytes, values) {
    const length = bytes.reduce((acc, cur) => acc + cur, 0);
    const buf = Buffer.alloc(length);
    let offset = 0;
    values.forEach((v, i) => {
        const size = bytes[i];
        if (size === 8)
            buf.writeBigUInt64BE(v, offset);
        else
            buf.writeUIntBE(v, offset, size);
        offset += size;
    });
    return buf;
}
exports.bufferWriter = bufferWriter;
function bufferReader(buf, bytes) {
    let offset = 0;
    return bytes.map((v) => {
        let read;
        if (v === 8) {
            read = buf.readBigUInt64BE(offset);
        }
        else {
            read = buf.readUIntBE(offset, v);
        }
        offset += v;
        return read;
    });
}
exports.bufferReader = bufferReader;
function growBufferSize(buf, size) {
    const glow = Buffer.alloc(size);
    buf.copy(glow);
    return glow;
}
exports.growBufferSize = growBufferSize;
function Int(v) {
    return parseInt(v.toString(), 10);
}
exports.Int = Int;
//# sourceMappingURL=helper.js.map