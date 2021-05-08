"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DtlsPlaintext = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
const binary_data_1 = require("binary-data");
const header_1 = require("./header");
class DtlsPlaintext {
    constructor(recordLayerHeader, fragment) {
        this.recordLayerHeader = recordLayerHeader;
        this.fragment = fragment;
    }
    static createEmpty() {
        return new DtlsPlaintext(undefined, undefined);
    }
    static deSerialize(buf) {
        const r = new DtlsPlaintext(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, DtlsPlaintext.spec)));
        return r;
    }
    serialize() {
        const res = binary_data_1.encode(this, DtlsPlaintext.spec).slice();
        return Buffer.from(res);
    }
    computeMACHeader() {
        return new header_1.MACHeader(this.recordLayerHeader.epoch, this.recordLayerHeader.sequenceNumber, this.recordLayerHeader.contentType, this.recordLayerHeader.protocolVersion, this.recordLayerHeader.contentLen).serialize();
    }
}
exports.DtlsPlaintext = DtlsPlaintext;
DtlsPlaintext.spec = {
    recordLayerHeader: header_1.DtlsPlaintextHeader.spec,
    fragment: binary_data_1.types.buffer((context) => context.current.recordLayerHeader.contentLen),
};
//# sourceMappingURL=plaintext.js.map