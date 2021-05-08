"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flight2 = void 0;
const tslib_1 = require("tslib");
const random_1 = require("../../handshake/random");
const builder_1 = require("../../record/builder");
const ellipticCurves_1 = require("../../handshake/extensions/ellipticCurves");
const signature_1 = require("../../handshake/extensions/signature");
const namedCurve_1 = require("../../cipher/namedCurve");
const helloVerifyRequest_1 = require("../../handshake/message/server/helloVerifyRequest");
const crypto_1 = require("crypto");
const const_1 = require("../../cipher/const");
const const_2 = require("../../record/const");
const useSrtp_1 = require("../../handshake/extensions/useSrtp");
const srtp_1 = require("../../context/srtp");
const debug_1 = tslib_1.__importDefault(require("debug"));
const extendedMasterSecret_1 = require("../../handshake/extensions/extendedMasterSecret");
const renegotiationIndication_1 = require("../../handshake/extensions/renegotiationIndication");
const log = debug_1.default("werift/dtls/flight/server/flight2");
// HelloVerifyRequest do not retransmit
const flight2 = (udp, dtls, cipher, srtp) => (clientHello) => {
    dtls.flight = 2;
    clientHello.extensions.forEach((extension) => {
        switch (extension.type) {
            case ellipticCurves_1.EllipticCurves.type:
                {
                    const curves = ellipticCurves_1.EllipticCurves.fromData(extension.data).data;
                    log("curves", curves);
                    const curve = curves.find((curve) => Object.values(const_1.NamedCurveAlgorithm).includes(curve));
                    cipher.namedCurve = curve;
                    log("curve selected", cipher.namedCurve);
                }
                break;
            case signature_1.Signature.type:
                {
                    if (!cipher.signatureHashAlgorithm)
                        throw new Error("need to set certificate");
                    const signatureHash = signature_1.Signature.fromData(extension.data).data;
                    log("hash,signature", signatureHash);
                    const signature = signatureHash.find((v) => v.signature === cipher.signatureHashAlgorithm?.signature)?.signature;
                    const hash = signatureHash.find((v) => v.hash === cipher.signatureHashAlgorithm?.hash)?.hash;
                    if (signature == undefined || hash == undefined)
                        throw new Error("invalid signatureHash");
                }
                break;
            case useSrtp_1.UseSRTP.type:
                {
                    if (!dtls.options?.srtpProfiles)
                        return;
                    if (dtls.options.srtpProfiles.length === 0)
                        return;
                    const useSrtp = useSrtp_1.UseSRTP.fromData(extension.data);
                    log("srtp profiles", useSrtp.profiles);
                    const profile = srtp_1.SrtpContext.findMatchingSRTPProfile(useSrtp.profiles, dtls.options?.srtpProfiles);
                    if (!profile) {
                        throw new Error();
                    }
                    srtp.srtpProfile = profile;
                    log("srtp profile selected", srtp.srtpProfile);
                }
                break;
            case extendedMasterSecret_1.ExtendedMasterSecret.type:
                {
                    dtls.remoteExtendedMasterSecret = true;
                }
                break;
            case renegotiationIndication_1.RenegotiationIndication.type:
                {
                    log("RenegotiationIndication", extension.data);
                }
                break;
        }
    });
    cipher.localRandom = new random_1.DtlsRandom();
    cipher.remoteRandom = random_1.DtlsRandom.from(clientHello.random);
    const suites = clientHello.cipherSuites;
    log("cipher suites", suites);
    const suite = (() => {
        switch (cipher.signatureHashAlgorithm?.signature) {
            case const_1.SignatureAlgorithm.ecdsa:
                return const_1.CipherSuite.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256;
            case const_1.SignatureAlgorithm.rsa:
                return const_1.CipherSuite.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256;
        }
    })();
    if (suite === undefined || !suites.includes(suite)) {
        throw new Error("dtls cipher suite negotiation failed");
    }
    cipher.cipherSuite = suite;
    log("selected cipherSuite", cipher.cipherSuite);
    cipher.localKeyPair = namedCurve_1.generateKeyPair(cipher.namedCurve);
    dtls.cookie = crypto_1.randomBytes(20);
    const helloVerifyReq = new helloVerifyRequest_1.ServerHelloVerifyRequest({
        major: 255 - 1,
        minor: 255 - 2,
    }, dtls.cookie);
    const fragments = builder_1.createFragments(dtls)([helloVerifyReq]);
    const packets = builder_1.createPlaintext(dtls)(fragments.map((fragment) => ({
        type: const_2.ContentType.handshake,
        fragment: fragment.serialize(),
    })), ++dtls.recordSequenceNumber);
    const buf = packets.map((v) => v.serialize());
    buf.forEach((v) => udp.send(v));
};
exports.flight2 = flight2;
//# sourceMappingURL=flight2.js.map