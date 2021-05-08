"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateVerify = void 0;
const binary_data_1 = require("binary-data");
const const_1 = require("../../const");
const fragment_1 = require("../../../record/message/fragment");
class CertificateVerify {
    constructor(algorithm, signature) {
        this.algorithm = algorithm;
        this.signature = signature;
        this.msgType = const_1.HandshakeType.certificate_verify;
    }
    static createEmpty() {
        return new CertificateVerify(undefined, undefined);
    }
    static deSerialize(buf) {
        const res = binary_data_1.decode(buf, CertificateVerify.spec);
        return new CertificateVerify(
        //@ts-ignore
        ...Object.values(res));
    }
    serialize() {
        const res = binary_data_1.encode(this, CertificateVerify.spec).slice();
        return Buffer.from(res);
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.CertificateVerify = CertificateVerify;
CertificateVerify.spec = {
    algorithm: binary_data_1.types.uint16be,
    signature: binary_data_1.types.buffer(binary_data_1.types.uint16be),
};
//# sourceMappingURL=certificateVerify.js.map