"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTCDtlsParameters = exports.RTCDtlsFingerprint = exports.RTCCertificate = exports.DtlsStates = exports.RTCDtlsTransport = void 0;
const tslib_1 = require("tslib");
const x509_1 = require("@fidm/x509");
const debug_1 = tslib_1.__importDefault(require("debug"));
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
const src_1 = require("../../../dtls/src");
const const_1 = require("../../../dtls/src/cipher/const");
const cipher_1 = require("../../../dtls/src/context/cipher");
const src_2 = require("../../../rtp/src");
const helper_1 = require("../helper");
const utils_1 = require("../utils");
const log = debug_1.default("werift/webrtc/transport/dtls");
class RTCDtlsTransport {
    constructor(iceTransport, router, certificates, srtpProfiles = []) {
        this.iceTransport = iceTransport;
        this.router = router;
        this.certificates = certificates;
        this.srtpProfiles = srtpProfiles;
        this.state = "new";
        this.role = "auto";
        this.srtpStarted = false;
        this.transportSequenceNumber = 0;
        this.onStateChange = new rx_mini_1.default();
        this.localCertificate = this.certificates[0];
        this.sendData = async (data) => {
            if (!this.dtls)
                throw new Error("dtls not established");
            await this.dtls.send(data);
        };
    }
    get localParameters() {
        return new RTCDtlsParameters(this.localCertificate ? this.localCertificate.getFingerprints() : [], this.role);
    }
    async setupCertificate() {
        if (!this.localCertificate) {
            const { certPem, keyPem, signatureHash, } = await cipher_1.CipherContext.createSelfSignedCertificateWithKey({
                signature: const_1.SignatureAlgorithm.ecdsa,
                hash: const_1.HashAlgorithm.sha256,
            }, const_1.NamedCurveAlgorithm.secp256r1);
            this.localCertificate = new RTCCertificate(keyPem, certPem, signatureHash);
        }
    }
    async start(remoteParameters) {
        if (this.state !== "new")
            throw new Error();
        if (remoteParameters.fingerprints.length === 0)
            throw new Error();
        if (this.role === "auto") {
            if (this.iceTransport.role === "controlling") {
                this.role = "server";
            }
            else {
                this.role = "client";
            }
        }
        this.setState("connecting");
        await new Promise(async (r) => {
            if (this.role === "server") {
                this.dtls = new src_1.DtlsServer({
                    cert: this.localCertificate?.certPem,
                    key: this.localCertificate?.privateKey,
                    signatureHash: this.localCertificate?.signatureHash,
                    transport: createIceTransport(this.iceTransport.connection),
                    srtpProfiles: this.srtpProfiles,
                    extendedMasterSecret: true,
                });
            }
            else {
                this.dtls = new src_1.DtlsClient({
                    cert: this.localCertificate?.certPem,
                    key: this.localCertificate?.privateKey,
                    signatureHash: this.localCertificate?.signatureHash,
                    transport: createIceTransport(this.iceTransport.connection),
                    srtpProfiles: this.srtpProfiles,
                    extendedMasterSecret: true,
                });
            }
            this.dtls.onData.subscribe((buf) => {
                if (this.dataReceiver)
                    this.dataReceiver(buf);
            });
            this.dtls.onClose.once(() => {
                this.setState("closed");
            });
            this.dtls.onConnect.once(r);
            if (this.dtls instanceof src_1.DtlsClient) {
                await helper_1.sleep(100);
                this.dtls.connect();
            }
        });
        if (this.srtpProfiles.length > 0) {
            this.startSrtp();
        }
        this.setState("connected");
        log("dtls connected");
    }
    startSrtp() {
        if (!this.dtls)
            throw new Error();
        if (this.srtpStarted)
            return;
        this.srtpStarted = true;
        const { localKey, localSalt, remoteKey, remoteSalt, } = this.dtls.extractSessionKeys();
        if (!this.dtls.srtp.srtpProfile)
            throw new Error("need srtpProfile");
        const config = {
            keys: {
                localMasterKey: localKey,
                localMasterSalt: localSalt,
                remoteMasterKey: remoteKey,
                remoteMasterSalt: remoteSalt,
            },
            profile: this.dtls.srtp.srtpProfile,
        };
        this.srtp = new src_2.SrtpSession(config);
        this.srtcp = new src_2.SrtcpSession(config);
        this.iceTransport.connection.onData.subscribe((data) => {
            if (!utils_1.isMedia(data))
                return;
            if (utils_1.isRtcp(data)) {
                const dec = this.srtcp.decrypt(data);
                const rtcps = src_2.RtcpPacketConverter.deSerialize(dec);
                rtcps.forEach((rtcp) => this.router.routeRtcp(rtcp));
            }
            else {
                const dec = this.srtp.decrypt(data);
                const rtp = src_2.RtpPacket.deSerialize(dec);
                this.router.routeRtp(rtp);
            }
        });
    }
    sendRtp(payload, header) {
        const enc = this.srtp.encrypt(payload, header);
        this.iceTransport.connection.send(enc);
        return enc.length;
    }
    async sendRtcp(packets) {
        const payload = Buffer.concat(packets.map((packet) => packet.serialize()));
        const enc = this.srtcp.encrypt(payload);
        try {
            await this.iceTransport.connection.send(enc);
        }
        catch (error) {
            throw new Error("ice");
        }
    }
    setState(state) {
        if (state != this.state) {
            this.state = state;
            this.onStateChange.execute(state);
        }
    }
    async stop() {
        this.setState("closed");
        // todo impl send alert
    }
}
exports.RTCDtlsTransport = RTCDtlsTransport;
exports.DtlsStates = [
    "new",
    "connecting",
    "connected",
    "closed",
    "failed",
];
class RTCCertificate {
    constructor(privateKeyPem, certPem, signatureHash) {
        this.certPem = certPem;
        this.signatureHash = signatureHash;
        const cert = x509_1.Certificate.fromPEM(Buffer.from(certPem));
        this.publicKey = cert.publicKey.toPEM();
        this.privateKey = x509_1.PrivateKey.fromPEM(Buffer.from(privateKeyPem)).toPEM();
    }
    getFingerprints() {
        return [
            new RTCDtlsFingerprint("sha-256", utils_1.fingerprint(x509_1.Certificate.fromPEM(Buffer.from(this.certPem)).raw, "sha256")),
        ];
    }
}
exports.RTCCertificate = RTCCertificate;
class RTCDtlsFingerprint {
    constructor(algorithm, value) {
        this.algorithm = algorithm;
        this.value = value;
    }
}
exports.RTCDtlsFingerprint = RTCDtlsFingerprint;
class RTCDtlsParameters {
    constructor(fingerprints = [], role) {
        this.fingerprints = fingerprints;
        this.role = role;
    }
}
exports.RTCDtlsParameters = RTCDtlsParameters;
class IceTransport {
    constructor(ice) {
        this.ice = ice;
        this.send = this.ice.send;
        ice.onData.subscribe((buf) => {
            if (utils_1.isDtls(buf)) {
                if (this.onData)
                    this.onData(buf);
            }
        });
    }
    close() {
        this.ice.close();
    }
}
const createIceTransport = (ice) => new IceTransport(ice);
//# sourceMappingURL=dtls.js.map