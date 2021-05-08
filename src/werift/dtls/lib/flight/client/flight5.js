"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flight5 = void 0;
const tslib_1 = require("tslib");
const hello_1 = require("../../handshake/message/server/hello");
const certificate_1 = require("../../handshake/message/certificate");
const helloDone_1 = require("../../handshake/message/server/helloDone");
const const_1 = require("../../handshake/const");
const keyExchange_1 = require("../../handshake/message/server/keyExchange");
const namedCurve_1 = require("../../cipher/namedCurve");
const prf_1 = require("../../cipher/prf");
const keyExchange_2 = require("../../handshake/message/client/keyExchange");
const changeCipherSpec_1 = require("../../handshake/message/changeCipherSpec");
const finished_1 = require("../../handshake/message/finished");
const builder_1 = require("../../record/builder");
const random_1 = require("../../handshake/random");
const const_2 = require("../../record/const");
const create_1 = require("../../cipher/create");
const certificateRequest_1 = require("../../handshake/message/server/certificateRequest");
const certificateVerify_1 = require("../../handshake/message/client/certificateVerify");
const useSrtp_1 = require("../../handshake/extensions/useSrtp");
const srtp_1 = require("../../context/srtp");
const flight_1 = require("../flight");
const debug_1 = tslib_1.__importDefault(require("debug"));
const extendedMasterSecret_1 = require("../../handshake/extensions/extendedMasterSecret");
const renegotiationIndication_1 = require("../../handshake/extensions/renegotiationIndication");
const const_3 = require("../../cipher/const");
const log = debug_1.default("werift/dtls/flight/client/flight5");
class Flight5 extends flight_1.Flight {
    constructor(udp, dtls, cipher, srtp) {
        super(udp, dtls, 5, 7);
        this.cipher = cipher;
        this.srtp = srtp;
    }
    handleHandshake(handshake) {
        this.dtls.bufferHandshakeCache([handshake], false, 4);
        const message = (() => {
            switch (handshake.msg_type) {
                case const_1.HandshakeType.server_hello:
                    return hello_1.ServerHello.deSerialize(handshake.fragment);
                case const_1.HandshakeType.certificate:
                    return certificate_1.Certificate.deSerialize(handshake.fragment);
                case const_1.HandshakeType.server_key_exchange:
                    return keyExchange_1.ServerKeyExchange.deSerialize(handshake.fragment);
                case const_1.HandshakeType.certificate_request:
                    return certificateRequest_1.ServerCertificateRequest.deSerialize(handshake.fragment);
                case const_1.HandshakeType.server_hello_done:
                    return helloDone_1.ServerHelloDone.deSerialize(handshake.fragment);
            }
        })();
        if (message) {
            handlers[message.msgType]({
                dtls: this.dtls,
                cipher: this.cipher,
                srtp: this.srtp,
            })(message);
        }
    }
    exec() {
        if (this.dtls.flight === 5) {
            log("flight5 twice");
            this.send(this.dtls.lastMessage);
            return;
        }
        this.dtls.flight = 5;
        const packets = [
            this.dtls.requestedCertificateTypes.length > 0 && this.sendCertificate(),
            this.sendClientKeyExchange(),
            this.dtls.requestedCertificateTypes.length > 0 &&
                this.sendCertificateVerify(),
            this.sendChangeCipherSpec(),
            this.sendFinished(),
        ].filter((v) => v);
        this.dtls.lastMessage = packets;
        this.transmit(packets);
    }
    sendCertificate() {
        const certificate = new certificate_1.Certificate([Buffer.from(this.cipher.localCert)]);
        const packets = this.createPacket([certificate]);
        const buf = Buffer.concat(packets.map((v) => v.serialize()));
        return buf;
    }
    sendClientKeyExchange() {
        if (!this.cipher.localKeyPair)
            throw new Error();
        const clientKeyExchange = new keyExchange_2.ClientKeyExchange(this.cipher.localKeyPair.publicKey);
        const packets = this.createPacket([clientKeyExchange]);
        const buf = Buffer.concat(packets.map((v) => v.serialize()));
        const localKeyPair = this.cipher.localKeyPair;
        const remoteKeyPair = this.cipher.remoteKeyPair;
        const preMasterSecret = prf_1.prfPreMasterSecret(remoteKeyPair.publicKey, localKeyPair.privateKey, localKeyPair.curve);
        log("extendedMasterSecret", this.dtls.options.extendedMasterSecret, this.dtls.remoteExtendedMasterSecret);
        const handshakes = Buffer.concat(this.dtls.handshakeCache.map((v) => v.data.serialize()));
        this.cipher.masterSecret =
            this.dtls.options.extendedMasterSecret &&
                this.dtls.remoteExtendedMasterSecret
                ? prf_1.prfExtendedMasterSecret(preMasterSecret, handshakes)
                : prf_1.prfMasterSecret(preMasterSecret, this.cipher.localRandom.serialize(), this.cipher.remoteRandom.serialize());
        this.cipher.cipher = create_1.createCipher(this.cipher.cipherSuite);
        this.cipher.cipher.init(this.cipher.masterSecret, this.cipher.remoteRandom.serialize(), this.cipher.localRandom.serialize());
        return buf;
    }
    sendCertificateVerify() {
        const cache = Buffer.concat(this.dtls.handshakeCache.map((v) => v.data.serialize()));
        const signed = this.cipher.signatureData(cache, "sha256");
        const signatureScheme = (() => {
            switch (this.cipher.signatureHashAlgorithm?.signature) {
                case const_3.SignatureAlgorithm.ecdsa:
                    return const_3.SignatureScheme.ecdsa_secp256r1_sha256;
                case const_3.SignatureAlgorithm.rsa:
                    return const_3.SignatureScheme.rsa_pkcs1_sha256;
            }
        })();
        if (!signatureScheme)
            throw new Error();
        log("signatureScheme", this.cipher.signatureHashAlgorithm?.signature, signatureScheme);
        const certificateVerify = new certificateVerify_1.CertificateVerify(signatureScheme, signed);
        const packets = this.createPacket([certificateVerify]);
        const buf = Buffer.concat(packets.map((v) => v.serialize()));
        return buf;
    }
    sendChangeCipherSpec() {
        const changeCipherSpec = changeCipherSpec_1.ChangeCipherSpec.createEmpty().serialize();
        const packets = builder_1.createPlaintext(this.dtls)([{ type: const_2.ContentType.changeCipherSpec, fragment: changeCipherSpec }], ++this.dtls.recordSequenceNumber);
        const buf = Buffer.concat(packets.map((v) => v.serialize()));
        return buf;
    }
    sendFinished() {
        const cache = Buffer.concat(this.dtls.handshakeCache.map((v) => v.data.serialize()));
        const localVerifyData = this.cipher.verifyData(cache);
        const finish = new finished_1.Finished(localVerifyData);
        this.dtls.epoch = 1;
        const [packet] = this.createPacket([finish]);
        this.dtls.recordSequenceNumber = 0;
        const buf = this.cipher.encryptPacket(packet).serialize();
        return buf;
    }
}
exports.Flight5 = Flight5;
const handlers = {};
handlers[const_1.HandshakeType.server_hello] = ({ cipher, srtp, dtls }) => (message) => {
    log("serverHello", message);
    cipher.remoteRandom = random_1.DtlsRandom.from(message.random);
    cipher.cipherSuite = message.cipherSuite;
    log("selected cipherSuite", cipher.cipherSuite);
    if (message.extensions) {
        message.extensions.forEach((extension) => {
            switch (extension.type) {
                case useSrtp_1.UseSRTP.type:
                    const useSrtp = useSrtp_1.UseSRTP.fromData(extension.data);
                    const profile = srtp_1.SrtpContext.findMatchingSRTPProfile(useSrtp.profiles, dtls.options.srtpProfiles || []);
                    log("selected srtp profile", profile);
                    if (profile == undefined)
                        return;
                    srtp.srtpProfile = profile;
                    break;
                case extendedMasterSecret_1.ExtendedMasterSecret.type:
                    dtls.remoteExtendedMasterSecret = true;
                    break;
                case renegotiationIndication_1.RenegotiationIndication.type:
                    log("RenegotiationIndication", extension.data);
                    break;
            }
        });
    }
};
handlers[const_1.HandshakeType.certificate] = ({ cipher }) => (message) => {
    log("handshake certificate", message);
    cipher.remoteCertificate = message.certificateList[0];
};
handlers[const_1.HandshakeType.server_key_exchange] = ({ cipher }) => (message) => {
    if (!cipher.localRandom || !cipher.remoteRandom)
        throw new Error();
    log("ServerKeyExchange", message);
    log("selected curve", message.namedCurve);
    cipher.remoteKeyPair = {
        curve: message.namedCurve,
        publicKey: message.publicKey,
    };
    cipher.localKeyPair = namedCurve_1.generateKeyPair(message.namedCurve);
};
handlers[const_1.HandshakeType.server_hello_done] = () => (msg) => {
    log("server_hello_done", msg);
};
handlers[const_1.HandshakeType.certificate_request] = ({ dtls }) => (message) => {
    log("certificate_request", message);
    dtls.requestedCertificateTypes = message.certificateTypes;
    dtls.requestedSignatureAlgorithms = message.signatures;
};
//# sourceMappingURL=flight5.js.map