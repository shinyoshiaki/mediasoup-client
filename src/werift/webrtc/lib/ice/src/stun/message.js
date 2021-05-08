"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = exports.parseMessage = void 0;
const tslib_1 = require("tslib");
const buffer_crc32_1 = tslib_1.__importDefault(require("buffer-crc32"));
const crypto_1 = require("crypto");
const jspack_1 = require("jspack");
const utils_1 = require("../utils");
const attributes_1 = require("./attributes");
const const_1 = require("./const");
function parseMessage(data, integrityKey) {
    if (data.length < const_1.HEADER_LENGTH) {
        return undefined;
    }
    const [messageType, length] = jspack_1.jspack.Unpack("!HHI", data.slice(0, const_1.HEADER_LENGTH));
    const transactionId = Buffer.from(data.slice(const_1.HEADER_LENGTH - 12, const_1.HEADER_LENGTH));
    if (data.length !== const_1.HEADER_LENGTH + length) {
        return undefined;
    }
    const attributes = {};
    for (let pos = const_1.HEADER_LENGTH; pos <= data.length - 4;) {
        const [attrType, attrLen] = jspack_1.jspack.Unpack("!HH", data.slice(pos, pos + 4));
        const v = data.slice(pos + 4, pos + 4 + attrLen);
        const padLen = 4 * Math.floor((attrLen + 3) / 4) - attrLen;
        const attributesTypes = Object.keys(attributes_1.ATTRIBUTES_BY_TYPE);
        if (attributesTypes.includes(attrType.toString())) {
            const [, attrName, , attrUnpack] = attributes_1.ATTRIBUTES_BY_TYPE[attrType];
            if (attrUnpack.name === attributes_1.unpackXorAddress.name) {
                attributes[attrName] = attrUnpack(v, transactionId);
            }
            else {
                attributes[attrName] = attrUnpack(v);
            }
            if (attrName === "FINGERPRINT") {
                const fingerprint = messageFingerprint(data.slice(0, pos));
                if (attributes[attrName] !== fingerprint) {
                    return undefined;
                }
            }
            else if (attrName === "MESSAGE-INTEGRITY") {
                if (integrityKey) {
                    const integrity = messageIntegrity(data.slice(0, pos), integrityKey);
                    if (!integrity.equals(attributes[attrName])) {
                        return undefined;
                    }
                }
            }
        }
        pos += 4 + attrLen + padLen;
    }
    return new Message(messageType & 0x3eef, messageType & 0x0110, transactionId, attributes);
}
exports.parseMessage = parseMessage;
class Message {
    constructor(messageMethod, messageClass, transactionId = utils_1.randomTransactionId(), attributes = {}) {
        this.messageMethod = messageMethod;
        this.messageClass = messageClass;
        this.transactionId = transactionId;
        this.attributes = attributes;
    }
    get attributesKeys() {
        return Object.keys(this.attributes);
    }
    get transactionIdHex() {
        return this.transactionId.toString("hex");
    }
    get bytes() {
        let data = Buffer.from([]);
        for (const attrName of this.attributesKeys) {
            const attrValue = this.attributes[attrName];
            const [attrType, , attrPack] = attributes_1.ATTRIBUTES_BY_NAME[attrName];
            const v = attrPack.name === attributes_1.packXorAddress.name
                ? attrPack(attrValue, this.transactionId)
                : attrPack(attrValue);
            const attrLen = v.length;
            const padLen = 4 * Math.floor((attrLen + 3) / 4) - attrLen;
            data = Buffer.concat([
                data,
                Buffer.from(jspack_1.jspack.Pack("!HH", [attrType, attrLen])),
                v,
                ...[...Array(padLen)].map(() => Buffer.from("\x00")),
            ]);
        }
        const buf = Buffer.from(jspack_1.jspack.Pack("!HHI", [
            this.messageMethod | this.messageClass,
            data.length,
            const_1.COOKIE,
        ]));
        return Buffer.concat([buf, this.transactionId, data]);
    }
    addFingerprint() {
        this.attributes["FINGERPRINT"] = messageFingerprint(this.bytes);
    }
    addMessageIntegrity(key) {
        this.attributes["MESSAGE-INTEGRITY"] = messageIntegrity(this.bytes, key);
    }
}
exports.Message = Message;
const setBodyLength = (data, length) => {
    return Buffer.concat([
        data.slice(0, 2),
        Buffer.from(jspack_1.jspack.Pack("!H", [length])),
        data.slice(4),
    ]);
};
function messageFingerprint(data) {
    const checkData = setBodyLength(data, data.length - const_1.HEADER_LENGTH + const_1.FINGERPRINT_LENGTH);
    const crc32Buf = buffer_crc32_1.default(checkData);
    const xorBuf = Buffer.alloc(4);
    xorBuf.writeInt32BE(const_1.FINGERPRINT_XOR, 0);
    const fingerprint = utils_1.bufferXor(crc32Buf, xorBuf);
    return fingerprint.readUInt32BE(0);
}
function messageIntegrity(data, key) {
    const checkData = setBodyLength(data, data.length - const_1.HEADER_LENGTH + const_1.INTEGRITY_LENGTH);
    return Buffer.from(crypto_1.createHmac("sha1", key).update(checkData).digest("hex"), "hex");
}
//# sourceMappingURL=message.js.map