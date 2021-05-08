"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerCertificateRequest = void 0;
const binary_data_1 = require("binary-data");
const const_1 = require("../../const");
const binary_1 = require("../../binary");
const fragment_1 = require("../../../record/message/fragment");
// 7.4.4.  Certificate Request
class ServerCertificateRequest {
    constructor(certificateTypes, signatures, authorities) {
        this.certificateTypes = certificateTypes;
        this.signatures = signatures;
        this.authorities = authorities;
        this.msgType = const_1.HandshakeType.certificate_request;
    }
    static createEmpty() {
        return new ServerCertificateRequest(undefined, undefined, undefined);
    }
    static deSerialize(buf) {
        return new ServerCertificateRequest(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, ServerCertificateRequest.spec)));
    }
    serialize() {
        const res = binary_data_1.encode(this, ServerCertificateRequest.spec).slice();
        return Buffer.from(res);
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.ServerCertificateRequest = ServerCertificateRequest;
ServerCertificateRequest.spec = {
    certificateTypes: binary_data_1.types.array(binary_1.ClientCertificateType, binary_data_1.types.uint8, "bytes"),
    signatures: binary_data_1.types.array(binary_1.SignatureHashAlgorithm, binary_data_1.types.uint16be, "bytes"),
    authorities: binary_data_1.types.array(binary_1.DistinguishedName, binary_data_1.types.uint16be, "bytes"),
};
//# sourceMappingURL=certificateRequest.js.map