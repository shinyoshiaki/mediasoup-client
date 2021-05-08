"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prfEncryptionKeys = exports.prfVerifyDataServer = exports.prfVerifyDataClient = exports.prfVerifyData = exports.hash = exports.exportKeyingMaterial = exports.prfExtendedMasterSecret = exports.prfMasterSecret = exports.prfPHash = exports.hmac = exports.prfPreMasterSecret = void 0;
const tslib_1 = require("tslib");
const binary_data_1 = require("binary-data");
const crypto_1 = require("crypto");
const elliptic_1 = require("elliptic");
const nacl = tslib_1.__importStar(require("tweetnacl"));
const const_1 = require("./const");
function prfPreMasterSecret(publicKey, privateKey, curve) {
    switch (curve) {
        case const_1.NamedCurveAlgorithm.secp256r1:
            const elliptic = new elliptic_1.ec("p256"); // aka secp256r1
            const pub = elliptic.keyFromPublic(publicKey).getPublic();
            const priv = elliptic.keyFromPrivate(privateKey).getPrivate();
            const res = pub.mul(priv);
            const secret = Buffer.from(res.encode("array", false)).slice(1, 33);
            return secret;
        case const_1.NamedCurveAlgorithm.x25519:
            return Buffer.from(nacl.scalarMult(privateKey, publicKey));
        default:
            throw new Error();
    }
}
exports.prfPreMasterSecret = prfPreMasterSecret;
function hmac(algorithm, secret, data) {
    const hash = crypto_1.createHmac(algorithm, secret);
    hash.update(data);
    return hash.digest();
}
exports.hmac = hmac;
function prfPHash(secret, seed, requestedLegth, algorithm = "sha256") {
    const totalLength = requestedLegth;
    const bufs = [];
    let Ai = seed; // A0
    do {
        Ai = hmac(algorithm, secret, Ai); // A(i) = HMAC(secret, A(i-1))
        const output = hmac(algorithm, secret, Buffer.concat([Ai, seed]));
        bufs.push(output);
        requestedLegth -= output.length; // eslint-disable-line no-param-reassign
    } while (requestedLegth > 0);
    return Buffer.concat(bufs, totalLength);
}
exports.prfPHash = prfPHash;
function prfMasterSecret(preMasterSecret, clientRandom, serverRandom) {
    const seed = Buffer.concat([
        Buffer.from("master secret"),
        clientRandom,
        serverRandom,
    ]);
    return prfPHash(preMasterSecret, seed, 48);
}
exports.prfMasterSecret = prfMasterSecret;
function prfExtendedMasterSecret(preMasterSecret, handshakes) {
    const sessionHash = hash("sha256", handshakes);
    const label = "extended master secret";
    return prfPHash(preMasterSecret, Buffer.concat([Buffer.from(label), sessionHash]), 48);
}
exports.prfExtendedMasterSecret = prfExtendedMasterSecret;
function exportKeyingMaterial(label, length, masterSecret, localRandom, remoteRandom, isClient) {
    const clientRandom = isClient ? localRandom : remoteRandom;
    const serverRandom = isClient ? remoteRandom : localRandom;
    const seed = Buffer.concat([Buffer.from(label), clientRandom, serverRandom]);
    return prfPHash(masterSecret, seed, length);
}
exports.exportKeyingMaterial = exportKeyingMaterial;
function hash(algorithm, data) {
    return crypto_1.createHash(algorithm).update(data).digest();
}
exports.hash = hash;
function prfVerifyData(masterSecret, handshakes, label, size = 12) {
    const bytes = hash("sha256", handshakes);
    return prfPHash(masterSecret, Buffer.concat([Buffer.from(label), bytes]), size);
}
exports.prfVerifyData = prfVerifyData;
function prfVerifyDataClient(masterSecret, handshakes) {
    return prfVerifyData(masterSecret, handshakes, "client finished");
}
exports.prfVerifyDataClient = prfVerifyDataClient;
function prfVerifyDataServer(masterSecret, handshakes) {
    return prfVerifyData(masterSecret, handshakes, "server finished");
}
exports.prfVerifyDataServer = prfVerifyDataServer;
function prfEncryptionKeys(masterSecret, clientRandom, serverRandom, prfKeyLen, prfIvLen, prfNonceLen, algorithm = "sha256") {
    const size = prfKeyLen * 2 + prfIvLen * 2;
    const secret = masterSecret;
    const seed = Buffer.concat([serverRandom, clientRandom]);
    const keyBlock = prfPHash(secret, Buffer.concat([Buffer.from("key expansion"), seed]), size, algorithm);
    const stream = binary_data_1.createDecode(keyBlock);
    const clientWriteKey = stream.readBuffer(prfKeyLen);
    const serverWriteKey = stream.readBuffer(prfKeyLen);
    const clientNonceImplicit = stream.readBuffer(prfIvLen);
    const serverNonceImplicit = stream.readBuffer(prfIvLen);
    const clientNonce = Buffer.alloc(prfNonceLen, 0);
    const serverNonce = Buffer.alloc(prfNonceLen, 0);
    clientNonceImplicit.copy(clientNonce, 0);
    serverNonceImplicit.copy(serverNonce, 0);
    return { clientWriteKey, serverWriteKey, clientNonce, serverNonce };
}
exports.prfEncryptionKeys = prfEncryptionKeys;
//# sourceMappingURL=prf.js.map