"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MACHeader = exports.DtlsPlaintextHeader = void 0;
const binary_data_1 = require("binary-data");
const binary_1 = require("../../handshake/binary");
class DtlsPlaintextHeader {
    constructor(contentType, protocolVersion, epoch, sequenceNumber, contentLen) {
        this.contentType = contentType;
        this.protocolVersion = protocolVersion;
        this.epoch = epoch;
        this.sequenceNumber = sequenceNumber;
        this.contentLen = contentLen;
    }
    static createEmpty() {
        return new DtlsPlaintextHeader(undefined, undefined, undefined, undefined, undefined);
    }
    static deSerialize(buf) {
        return new DtlsPlaintextHeader(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, DtlsPlaintextHeader.spec)));
    }
    serialize() {
        const res = binary_data_1.encode(this, DtlsPlaintextHeader.spec).slice();
        return Buffer.from(res);
    }
}
exports.DtlsPlaintextHeader = DtlsPlaintextHeader;
DtlsPlaintextHeader.spec = {
    contentType: binary_data_1.types.uint8,
    protocolVersion: binary_1.ProtocolVersion,
    epoch: binary_data_1.types.uint16be,
    sequenceNumber: binary_data_1.types.uint48be,
    contentLen: binary_data_1.types.uint16be,
};
class MACHeader {
    constructor(epoch, sequenceNumber, contentType, protocolVersion, contentLen) {
        this.epoch = epoch;
        this.sequenceNumber = sequenceNumber;
        this.contentType = contentType;
        this.protocolVersion = protocolVersion;
        this.contentLen = contentLen;
    }
    static createEmpty() {
        return new MACHeader(undefined, undefined, undefined, undefined, undefined);
    }
    static deSerialize(buf) {
        return new MACHeader(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, MACHeader.spec)));
    }
    serialize() {
        const res = binary_data_1.encode(this, MACHeader.spec).slice();
        return Buffer.from(res);
    }
}
exports.MACHeader = MACHeader;
MACHeader.spec = {
    epoch: binary_data_1.types.uint16be,
    sequenceNumber: binary_data_1.types.uint48be,
    contentType: binary_data_1.types.uint8,
    protocolVersion: binary_1.ProtocolVersion,
    contentLen: binary_data_1.types.uint16be,
};
//# sourceMappingURL=header.js.map