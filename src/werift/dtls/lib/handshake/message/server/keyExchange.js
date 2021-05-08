"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerKeyExchange = void 0;
const binary_data_1 = require("binary-data");
const const_1 = require("../../const");
const fragment_1 = require("../../../record/message/fragment");
const binary_1 = require("../../../util/binary");
class ServerKeyExchange {
    constructor(ellipticCurveType, namedCurve, publicKeyLength, publicKey, hashAlgorithm, signatureAlgorithm, signatureLength, signature) {
        this.ellipticCurveType = ellipticCurveType;
        this.namedCurve = namedCurve;
        this.publicKeyLength = publicKeyLength;
        this.publicKey = publicKey;
        this.hashAlgorithm = hashAlgorithm;
        this.signatureAlgorithm = signatureAlgorithm;
        this.signatureLength = signatureLength;
        this.signature = signature;
        this.msgType = const_1.HandshakeType.server_key_exchange;
    }
    static createEmpty() {
        return new ServerKeyExchange(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    }
    static deSerialize(buf) {
        const res = binary_data_1.decode(buf, ServerKeyExchange.spec);
        return new ServerKeyExchange(
        //@ts-ignore
        ...Object.values(res));
    }
    serialize() {
        const res = binary_1.encodeBuffer(this, ServerKeyExchange.spec);
        return res;
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.ServerKeyExchange = ServerKeyExchange;
ServerKeyExchange.spec = {
    ellipticCurveType: binary_data_1.types.uint8,
    namedCurve: binary_data_1.types.uint16be,
    publicKeyLength: binary_data_1.types.uint8,
    publicKey: binary_data_1.types.buffer((ctx) => ctx.current.publicKeyLength),
    hashAlgorithm: binary_data_1.types.uint8,
    signatureAlgorithm: binary_data_1.types.uint8,
    signatureLength: binary_data_1.types.uint16be,
    signature: binary_data_1.types.buffer((ctx) => ctx.current.signatureLength),
};
//# sourceMappingURL=keyExchange.js.map