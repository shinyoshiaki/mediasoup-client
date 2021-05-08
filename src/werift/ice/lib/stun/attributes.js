"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTRIBUTES_BY_NAME = exports.ATTRIBUTES_BY_TYPE = exports.packXorAddress = exports.packErrorCode = exports.unpackXorAddress = exports.unpackErrorCode = void 0;
const tslib_1 = require("tslib");
const int64_buffer_1 = require("int64-buffer");
const nodeIp = tslib_1.__importStar(require("ip"));
const jspack_1 = require("jspack");
const lodash_1 = require("lodash");
const const_1 = require("./const");
function packAddress(value) {
    const [address] = value;
    const protocol = nodeIp.isV4Format(address) ? const_1.IPV4_PROTOCOL : const_1.IPV6_PROTOCOL;
    return Buffer.concat([
        Buffer.from(jspack_1.jspack.Pack("!BBH", [0, protocol, value[1]])),
        nodeIp.toBuffer(address),
    ]);
}
function unpackErrorCode(data) {
    if (data.length < 4)
        throw new Error("STUN error code is less than 4 bytes");
    const [, codeHigh, codeLow] = jspack_1.jspack.Unpack("!HBB", data.slice(0, 4));
    const reason = data.slice(4).toString("utf8");
    return [codeHigh * 100 + codeLow, reason];
}
exports.unpackErrorCode = unpackErrorCode;
function unpackAddress(data) {
    if (data.length < 4)
        throw new Error("STUN address length is less than 4 bytes");
    const [, protocol, port] = jspack_1.jspack.Unpack("!BBH", data.slice(0, 4));
    const address = data.slice(4);
    switch (protocol) {
        case const_1.IPV4_PROTOCOL:
            if (address.length != 4)
                throw new Error(`STUN address has invalid length for IPv4`);
            return [nodeIp.toString(address), port];
        case const_1.IPV6_PROTOCOL:
            if (address.length != 16)
                throw new Error("STUN address has invalid length for IPv6");
            return [nodeIp.toString(address), port];
        default:
            throw new Error("STUN address has unknown protocol");
    }
}
function xorAddress(data, transactionId) {
    const xPad = [
        ...jspack_1.jspack.Pack("!HI", [const_1.COOKIE >> 16, const_1.COOKIE]),
        ...transactionId,
    ];
    let xData = data.slice(0, 2);
    for (const i of lodash_1.range(2, data.length)) {
        const num = data[i] ^ xPad[i - 2];
        const buf = Buffer.alloc(1);
        buf.writeUIntBE(num, 0, 1);
        xData = Buffer.concat([xData, buf]);
    }
    return xData;
}
function unpackXorAddress(data, transactionId) {
    return unpackAddress(xorAddress(data, transactionId));
}
exports.unpackXorAddress = unpackXorAddress;
function packErrorCode(value) {
    const pack = Buffer.from(jspack_1.jspack.Pack("!HBB", [0, Math.floor(value[0] / 100), value[0] % 100]));
    const encode = Buffer.from(value[1], "utf8");
    return Buffer.concat([pack, encode]);
}
exports.packErrorCode = packErrorCode;
function packXorAddress(value, transactionId) {
    return xorAddress(packAddress(value), transactionId);
}
exports.packXorAddress = packXorAddress;
const packUnsigned = (value) => Buffer.from(jspack_1.jspack.Pack("!I", [value]));
const unpackUnsigned = (data) => jspack_1.jspack.Unpack("!I", data)[0];
const packUnsignedShort = (value) => Buffer.concat([
    Buffer.from(jspack_1.jspack.Pack("!H", [value])),
    Buffer.from("\x00\x00"),
]);
const unpackUnsignedShort = (data) => jspack_1.jspack.Unpack("!H", data.slice(0, 2))[0];
const packUnsigned64 = (value) => {
    return new int64_buffer_1.Int64BE(value.toString()).toBuffer();
};
const unpackUnsigned64 = (data) => {
    const int = new int64_buffer_1.Int64BE(data);
    return BigInt(int.toString());
};
const packString = (value) => Buffer.from(value, "utf8");
const unpackString = (data) => data.toString("utf8");
const packBytes = (value) => value;
const unpackBytes = (data) => data;
const packNone = (value) => Buffer.from([]);
const unpackNone = (data) => null;
const ATTRIBUTES = [
    [0x0001, "MAPPED-ADDRESS", packAddress, unpackAddress],
    [0x0003, "CHANGE-REQUEST", packUnsigned, unpackUnsigned],
    [0x0004, "SOURCE-ADDRESS", packAddress, unpackAddress],
    [0x0005, "CHANGED-ADDRESS", packAddress, unpackAddress],
    [0x0006, "USERNAME", packString, unpackString],
    [0x0008, "MESSAGE-INTEGRITY", packBytes, unpackBytes],
    [0x0009, "ERROR-CODE", packErrorCode, unpackErrorCode],
    [0x000c, "CHANNEL-NUMBER", packUnsignedShort, unpackUnsignedShort],
    [0x000d, "LIFETIME", packUnsigned, unpackUnsigned],
    [0x0012, "XOR-PEER-ADDRESS", packXorAddress, unpackXorAddress],
    [0x0013, "DATA", packBytes, unpackBytes],
    [0x0014, "REALM", packString, unpackString],
    [0x0015, "NONCE", packBytes, unpackBytes],
    [0x0016, "XOR-RELAYED-ADDRESS", packXorAddress, unpackXorAddress],
    [0x0019, "REQUESTED-TRANSPORT", packUnsigned, unpackUnsigned],
    [0x0020, "XOR-MAPPED-ADDRESS", packXorAddress, unpackXorAddress],
    [0x0024, "PRIORITY", packUnsigned, unpackUnsigned],
    [0x0025, "USE-CANDIDATE", packNone, unpackNone],
    [0x8022, "SOFTWARE", packString, unpackString],
    [0x8028, "FINGERPRINT", packUnsigned, unpackUnsigned],
    [0x8029, "ICE-CONTROLLED", packUnsigned64, unpackUnsigned64],
    [0x802a, "ICE-CONTROLLING", packUnsigned64, unpackUnsigned64],
    [0x802b, "RESPONSE-ORIGIN", packAddress, unpackAddress],
    [0x802c, "OTHER-ADDRESS", packAddress, unpackAddress],
];
exports.ATTRIBUTES_BY_TYPE = ATTRIBUTES.reduce((acc, cur) => {
    acc[cur[0]] = cur;
    return acc;
}, {});
exports.ATTRIBUTES_BY_NAME = ATTRIBUTES.reduce((acc, cur) => {
    acc[cur[1]] = cur;
    return acc;
}, {});
//# sourceMappingURL=attributes.js.map