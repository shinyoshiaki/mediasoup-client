"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Certificate = void 0;
const binary_data_1 = require("binary-data");
const const_1 = require("../const");
const binary_1 = require("../binary");
const fragment_1 = require("../../record/message/fragment");
// 7.4.2.  Server Certificate
// 7.4.6.  Client Certificate
class Certificate {
    constructor(certificateList) {
        this.certificateList = certificateList;
        this.msgType = const_1.HandshakeType.certificate;
    }
    static createEmpty() {
        return new Certificate(undefined);
    }
    static deSerialize(buf) {
        return new Certificate(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, Certificate.spec)));
    }
    serialize() {
        const res = binary_data_1.encode(this, Certificate.spec).slice();
        return Buffer.from(res);
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.Certificate = Certificate;
Certificate.spec = {
    certificateList: binary_data_1.types.array(binary_1.ASN11Cert, binary_data_1.types.uint24be, "bytes"),
};
//# sourceMappingURL=certificate.js.map