"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CipherContext = void 0;
const tslib_1 = require("tslib");
const x509_1 = require("@fidm/x509");
const webcrypto_1 = require("@peculiar/webcrypto");
const x509 = tslib_1.__importStar(require("@peculiar/x509"));
const binary_data_1 = require("binary-data");
const crypto_1 = require("crypto");
const date_fns_1 = require("date-fns");
const debug_1 = tslib_1.__importDefault(require("debug"));
const tweetnacl_1 = require("tweetnacl");
const const_1 = require("../cipher/const");
const prf_1 = require("../cipher/prf");
const abstract_1 = require("../cipher/suites/abstract");
const binary_1 = require("../handshake/binary");
const log = debug_1.default("werift/dtls/context/cipher");
const crypto = new webcrypto_1.Crypto();
x509.cryptoProvider.set(crypto);
class CipherContext {
    constructor(sessionType, certPem, keyPem, signatureHashAlgorithm) {
        this.sessionType = sessionType;
        this.certPem = certPem;
        this.keyPem = keyPem;
        if (certPem && keyPem && signatureHashAlgorithm) {
            this.parseX509(certPem, keyPem, signatureHashAlgorithm);
        }
    }
    /**
     *
     * @param signatureHash
     * @param namedCurveAlgorithm necessary when use ecdsa
     * @returns
     */
    static async createSelfSignedCertificateWithKey(signatureHash, namedCurveAlgorithm) {
        const name = (() => {
            switch (signatureHash.signature) {
                case const_1.SignatureAlgorithm.rsa:
                    return "RSASSA-PKCS1-v1_5";
                case const_1.SignatureAlgorithm.ecdsa:
                    return "ECDSA";
            }
        })();
        const hash = (() => {
            switch (signatureHash.hash) {
                case const_1.HashAlgorithm.sha256:
                    return "SHA-256";
            }
        })();
        const namedCurve = (() => {
            switch (namedCurveAlgorithm) {
                case const_1.NamedCurveAlgorithm.secp256r1:
                    return "P-256";
                case const_1.NamedCurveAlgorithm.x25519:
                    // todo fix (X25519 not supported with ECDSA)
                    if (name === "ECDSA")
                        return "P-256";
                    return "X25519";
                default:
                    if (name === "ECDSA")
                        return "P-256";
            }
        })();
        const alg = (() => {
            switch (name) {
                case "ECDSA":
                    return { name, hash, namedCurve };
                case "RSASSA-PKCS1-v1_5":
                    return {
                        name,
                        hash,
                        publicExponent: new Uint8Array([1, 0, 1]),
                        modulusLength: 2048,
                    };
            }
        })();
        log("createCertificateWithKey alg", alg);
        const keys = (await crypto.subtle.generateKey(alg, true, [
            "sign",
            "verify",
        ]));
        const cert = await x509.X509CertificateGenerator.createSelfSigned({
            serialNumber: Buffer.from(tweetnacl_1.randomBytes(10)).toString("hex"),
            name: "C=AU, ST=Some-State, O=Internet Widgits Pty Ltd",
            notBefore: new Date(),
            notAfter: date_fns_1.addYears(Date.now(), 10),
            signingAlgorithm: alg,
            keys,
        });
        const certPem = cert.toString("pem");
        const keyPem = x509.PemConverter.encode(await crypto.subtle.exportKey("pkcs8", keys.privateKey), "private key");
        return { certPem, keyPem, signatureHash };
    }
    encryptPacket(pkt) {
        const header = pkt.recordLayerHeader;
        const enc = this.cipher.encrypt(this.sessionType, pkt.fragment, {
            type: header.contentType,
            version: binary_data_1.decode(Buffer.from(binary_data_1.encode(header.protocolVersion, binary_1.ProtocolVersion).slice()), { version: binary_data_1.types.uint16be }).version,
            epoch: header.epoch,
            sequenceNumber: header.sequenceNumber,
        });
        pkt.fragment = enc;
        pkt.recordLayerHeader.contentLen = enc.length;
        return pkt;
    }
    decryptPacket(pkt) {
        const header = pkt.recordLayerHeader;
        const dec = this.cipher.decrypt(this.sessionType, pkt.fragment, {
            type: header.contentType,
            version: binary_data_1.decode(Buffer.from(binary_data_1.encode(header.protocolVersion, binary_1.ProtocolVersion).slice()), { version: binary_data_1.types.uint16be }).version,
            epoch: header.epoch,
            sequenceNumber: header.sequenceNumber,
        });
        return dec;
    }
    verifyData(buf) {
        if (this.sessionType === abstract_1.SessionType.CLIENT)
            return prf_1.prfVerifyDataClient(this.masterSecret, buf);
        else
            return prf_1.prfVerifyDataServer(this.masterSecret, buf);
    }
    signatureData(data, hash) {
        const signature = crypto_1.createSign(hash).update(data);
        const key = this.localPrivateKey.toPEM().toString();
        const signed = signature.sign(key);
        return signed;
    }
    generateKeySignature(hashAlgorithm) {
        const clientRandom = this.sessionType === abstract_1.SessionType.CLIENT
            ? this.localRandom
            : this.remoteRandom;
        const serverRandom = this.sessionType === abstract_1.SessionType.SERVER
            ? this.localRandom
            : this.remoteRandom;
        const sig = this.valueKeySignature(clientRandom.serialize(), serverRandom.serialize(), this.localKeyPair.publicKey, this.namedCurve);
        const enc = this.localPrivateKey.sign(sig, hashAlgorithm);
        return enc;
    }
    parseX509(certPem, keyPem, signatureHash) {
        const cert = x509_1.Certificate.fromPEM(Buffer.from(certPem));
        const sec = x509_1.PrivateKey.fromPEM(Buffer.from(keyPem));
        this.localCert = cert.raw;
        this.localPrivateKey = sec;
        this.signatureHashAlgorithm = signatureHash;
    }
    valueKeySignature(clientRandom, serverRandom, publicKey, namedCurve) {
        const serverParams = Buffer.from(binary_data_1.encode({ type: 3, curve: namedCurve, len: publicKey.length }, { type: binary_data_1.types.uint8, curve: binary_data_1.types.uint16be, len: binary_data_1.types.uint8 }).slice());
        return Buffer.concat([clientRandom, serverRandom, serverParams, publicKey]);
    }
}
exports.CipherContext = CipherContext;
//# sourceMappingURL=cipher.js.map