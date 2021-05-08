"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SrtpContext = void 0;
const rtp_1 = require("../../rtp/rtp");
const crypto_1 = require("crypto");
const context_1 = require("./context");
const helper_1 = require("../../helper");
class SrtpContext extends context_1.Context {
    constructor(masterKey, masterSalt, profile) {
        super(masterKey, masterSalt, profile);
    }
    decryptRTP(ciphertext, header) {
        header = header || rtp_1.RtpHeader.deSerialize(ciphertext);
        const s = this.getSRTPSRRCState(header.ssrc);
        let dst = Buffer.from([]);
        dst = helper_1.growBufferSize(dst, ciphertext.length - 10);
        this.updateRolloverCount(header.sequenceNumber, s);
        ciphertext = ciphertext.slice(0, ciphertext.length - 10);
        ciphertext.slice(0, header.payloadOffset).copy(dst);
        const counter = this.generateCounter(header.sequenceNumber, s.rolloverCounter, s.ssrc, this.srtpSessionSalt);
        const cipher = crypto_1.createDecipheriv("aes-128-ctr", this.srtpSessionKey, counter);
        const payload = ciphertext.slice(header.payloadOffset);
        const buf = cipher.update(payload);
        buf.copy(dst, header.payloadOffset);
        return [dst, header];
    }
    encryptRTP(payload, header) {
        const dst = helper_1.growBufferSize(Buffer.from([]), header.serializeSize + payload.length + 10);
        const s = this.getSRTPSRRCState(header.ssrc);
        this.updateRolloverCount(header.sequenceNumber, s);
        header.serialize(dst.length).copy(dst);
        let n = header.payloadOffset;
        const counter = this.generateCounter(header.sequenceNumber, s.rolloverCounter, s.ssrc, this.srtpSessionSalt);
        const cipher = crypto_1.createCipheriv("aes-128-ctr", this.srtpSessionKey, counter);
        const buf = cipher.update(payload);
        buf.copy(dst, header.payloadOffset);
        n += payload.length;
        const authTag = this.generateSrtpAuthTag(dst.slice(0, n), s.rolloverCounter);
        authTag.copy(dst, n);
        return dst;
    }
}
exports.SrtpContext = SrtpContext;
//# sourceMappingURL=srtp.js.map