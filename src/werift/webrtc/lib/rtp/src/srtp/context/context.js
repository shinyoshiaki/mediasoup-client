"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
const tslib_1 = require("tslib");
const lodash_1 = require("lodash");
const aes_js_1 = require("aes-js");
const crypto_1 = require("crypto");
const big_integer_1 = tslib_1.__importDefault(require("big-integer"));
class Context {
    constructor(masterKey, masterSalt, profile) {
        this.masterKey = masterKey;
        this.masterSalt = masterSalt;
        this.profile = profile;
        this.srtpSSRCStates = {};
        this.srtpSessionKey = this.generateSessionKey(0);
        this.srtpSessionSalt = this.generateSessionSalt(2);
        this.srtpSessionAuthTag = this.generateSessionAuthTag(1);
        this.srtpSessionAuth = crypto_1.createHmac("sha1", this.srtpSessionAuthTag);
        this.srtcpSSRCStates = {};
        this.srtcpSessionKey = this.generateSessionKey(3);
        this.srtcpSessionSalt = this.generateSessionSalt(5);
        this.srtcpSessionAuthTag = this.generateSessionAuthTag(4);
        this.srtcpSessionAuth = crypto_1.createHmac("sha1", this.srtcpSessionAuthTag);
    }
    generateSessionKey(label) {
        let sessionKey = Buffer.from(this.masterSalt);
        const labelAndIndexOverKdr = Buffer.from([
            label,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
        ]);
        for (let i = labelAndIndexOverKdr.length - 1, j = sessionKey.length - 1; i >= 0; i--, j--) {
            sessionKey[j] = sessionKey[j] ^ labelAndIndexOverKdr[i];
        }
        sessionKey = Buffer.concat([sessionKey, Buffer.from([0x00, 0x00])]);
        const block = new aes_js_1.AES(this.masterKey);
        return Buffer.from(block.encrypt(sessionKey));
    }
    generateSessionSalt(label) {
        let sessionSalt = Buffer.from(this.masterSalt);
        const labelAndIndexOverKdr = Buffer.from([
            label,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
        ]);
        for (let i = labelAndIndexOverKdr.length - 1, j = sessionSalt.length - 1; i >= 0; i--, j--) {
            sessionSalt[j] = sessionSalt[j] ^ labelAndIndexOverKdr[i];
        }
        sessionSalt = Buffer.concat([sessionSalt, Buffer.from([0x00, 0x00])]);
        const block = new aes_js_1.AES(this.masterKey);
        sessionSalt = Buffer.from(block.encrypt(sessionSalt));
        return sessionSalt.slice(0, 14);
    }
    generateSessionAuthTag(label) {
        const sessionAuthTag = Buffer.from(this.masterSalt);
        const labelAndIndexOverKdr = Buffer.from([
            label,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
        ]);
        for (let i = labelAndIndexOverKdr.length - 1, j = sessionAuthTag.length - 1; i >= 0; i--, j--) {
            sessionAuthTag[j] = sessionAuthTag[j] ^ labelAndIndexOverKdr[i];
        }
        let firstRun = Buffer.concat([sessionAuthTag, Buffer.from([0x00, 0x00])]);
        let secondRun = Buffer.concat([sessionAuthTag, Buffer.from([0x00, 0x01])]);
        const block = new aes_js_1.AES(this.masterKey);
        firstRun = Buffer.from(block.encrypt(firstRun));
        secondRun = Buffer.from(block.encrypt(secondRun));
        return Buffer.concat([firstRun, secondRun.slice(0, 4)]);
    }
    getSRTPSRRCState(ssrc) {
        let s = this.srtpSSRCStates[ssrc];
        if (s)
            return s;
        s = {
            ssrc,
            rolloverCounter: 0,
            lastSequenceNumber: 0,
        };
        this.srtpSSRCStates[ssrc] = s;
        return s;
    }
    getSRTCPSSRCState(ssrc) {
        let s = this.srtcpSSRCStates[ssrc];
        if (s)
            return s;
        s = {
            srtcpIndex: 0,
            ssrc,
        };
        this.srtcpSSRCStates[ssrc] = s;
        return s;
    }
    updateRolloverCount(sequenceNumber, s) {
        if (!s.rolloverHasProcessed) {
            s.rolloverHasProcessed = true;
        }
        else if (sequenceNumber === 0) {
            if (s.lastSequenceNumber > MaxROCDisorder) {
                s.rolloverCounter++;
            }
        }
        else if (s.lastSequenceNumber < MaxROCDisorder &&
            sequenceNumber > MaxSequenceNumber - MaxROCDisorder) {
            s.rolloverCounter--;
        }
        else if (sequenceNumber < MaxROCDisorder &&
            s.lastSequenceNumber > MaxSequenceNumber - MaxROCDisorder) {
            s.rolloverCounter++;
        }
        s.lastSequenceNumber = sequenceNumber;
    }
    generateCounter(sequenceNumber, rolloverCounter, ssrc, sessionSalt) {
        const counter = Buffer.alloc(16);
        counter.writeUInt32BE(ssrc, 4);
        counter.writeUInt32BE(rolloverCounter, 8);
        counter.writeUInt32BE(big_integer_1.default(sequenceNumber).shiftLeft(16).toJSNumber(), 12);
        lodash_1.range(sessionSalt.length).forEach((i) => {
            counter[i] = counter[i] ^ sessionSalt[i];
        });
        return counter;
    }
    generateSrtpAuthTag(buf, roc) {
        this.srtpSessionAuth = crypto_1.createHmac("sha1", this.srtpSessionAuthTag);
        const rocRaw = Buffer.alloc(4);
        rocRaw.writeUInt32BE(roc);
        return this.srtpSessionAuth
            .update(buf)
            .update(rocRaw)
            .digest()
            .slice(0, 10);
    }
    generateSrtcpAuthTag(buf) {
        this.srtcpSessionAuth = crypto_1.createHmac("sha1", this.srtcpSessionAuthTag);
        return this.srtcpSessionAuth.update(buf).digest().slice(0, 10);
    }
    index(ssrc) {
        const s = this.srtcpSSRCStates[ssrc];
        if (!s) {
            return 0;
        }
        return s.srtcpIndex;
    }
    setIndex(ssrc, index) {
        const s = this.getSRTCPSSRCState(ssrc);
        s.srtcpIndex = index % 0x7fffffff;
    }
}
exports.Context = Context;
const MaxROCDisorder = 100;
const MaxSequenceNumber = 65535;
//# sourceMappingURL=context.js.map