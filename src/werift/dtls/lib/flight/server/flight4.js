"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flight4 = void 0;
const tslib_1 = require("tslib");
const hello_1 = require("../../handshake/message/server/hello");
const certificate_1 = require("../../handshake/message/certificate");
const keyExchange_1 = require("../../handshake/message/server/keyExchange");
const helloDone_1 = require("../../handshake/message/server/helloDone");
const const_1 = require("../../cipher/const");
const certificateRequest_1 = require("../../handshake/message/server/certificateRequest");
const useSrtp_1 = require("../../handshake/extensions/useSrtp");
const flight_1 = require("../flight");
const debug_1 = tslib_1.__importDefault(require("debug"));
const extendedMasterSecret_1 = require("../../handshake/extensions/extendedMasterSecret");
const renegotiationIndication_1 = require("../../handshake/extensions/renegotiationIndication");
const log = debug_1.default("werift/dtls/flight4");
class Flight4 extends flight_1.Flight {
    constructor(udp, dtls, cipher, srtp) {
        super(udp, dtls, 4, 6);
        this.cipher = cipher;
        this.srtp = srtp;
    }
    exec(assemble, certificateRequest = false) {
        if (this.dtls.flight === 4) {
            log("flight4 twice");
            this.send(this.dtls.lastMessage);
            return;
        }
        this.dtls.flight = 4;
        this.dtls.sequenceNumber = 1;
        this.dtls.bufferHandshakeCache([assemble], false, 4);
        const messages = [
            this.sendServerHello(),
            this.sendCertificate(),
            this.sendServerKeyExchange(),
            certificateRequest && this.sendCertificateRequest(),
            this.sendServerHelloDone(),
        ].filter((v) => v);
        this.dtls.lastMessage = messages;
        this.transmit(messages);
    }
    sendServerHello() {
        // todo fix; should use socket.extensions
        const extensions = [];
        if (this.srtp.srtpProfile) {
            extensions.push(useSrtp_1.UseSRTP.create([this.srtp.srtpProfile], Buffer.from([0x00])).extension);
        }
        if (this.dtls.options.extendedMasterSecret) {
            extensions.push({
                type: extendedMasterSecret_1.ExtendedMasterSecret.type,
                data: Buffer.alloc(0),
            });
        }
        const renegotiationIndication = renegotiationIndication_1.RenegotiationIndication.createEmpty();
        extensions.push(renegotiationIndication.extension);
        const serverHello = new hello_1.ServerHello(this.dtls.version, this.cipher.localRandom, Buffer.from([0x00]), this.cipher.cipherSuite, 0, // do not compression
        extensions);
        const packets = this.createPacket([serverHello]);
        return Buffer.concat(packets.map((v) => v.serialize()));
    }
    // 7.4.2 Server Certificate
    sendCertificate() {
        const certificate = new certificate_1.Certificate([Buffer.from(this.cipher.localCert)]);
        const packets = this.createPacket([certificate]);
        return Buffer.concat(packets.map((v) => v.serialize()));
    }
    sendServerKeyExchange() {
        const signature = this.cipher.generateKeySignature("sha256");
        const keyExchange = new keyExchange_1.ServerKeyExchange(const_1.CurveType.named_curve, this.cipher.namedCurve, this.cipher.localKeyPair.publicKey.length, this.cipher.localKeyPair.publicKey, this.cipher.signatureHashAlgorithm.hash, this.cipher.signatureHashAlgorithm.signature, signature.length, signature);
        const packets = this.createPacket([keyExchange]);
        return Buffer.concat(packets.map((v) => v.serialize()));
    }
    // 7.4.4.  Certificate Request
    sendCertificateRequest() {
        const handshake = new certificateRequest_1.ServerCertificateRequest([
            1,
            64, // clientCertificateTypeECDSASign
        ], [
            { hash: const_1.HashAlgorithm.sha256, signature: const_1.SignatureAlgorithm.rsa },
            { hash: const_1.HashAlgorithm.sha256, signature: const_1.SignatureAlgorithm.ecdsa },
        ], []);
        log("sendCertificateRequest", handshake);
        const packets = this.createPacket([handshake]);
        return Buffer.concat(packets.map((v) => v.serialize()));
    }
    sendServerHelloDone() {
        const handshake = new helloDone_1.ServerHelloDone();
        const packets = this.createPacket([handshake]);
        return Buffer.concat(packets.map((v) => v.serialize()));
    }
}
exports.Flight4 = Flight4;
//# sourceMappingURL=flight4.js.map