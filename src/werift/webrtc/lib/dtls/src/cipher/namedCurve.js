"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKeyPair = void 0;
const tslib_1 = require("tslib");
const elliptic_1 = require("elliptic");
const nacl = tslib_1.__importStar(require("tweetnacl"));
const const_1 = require("./const");
function generateKeyPair(namedCurve) {
    switch (namedCurve) {
        case const_1.NamedCurveAlgorithm.secp256r1: {
            const elliptic = new elliptic_1.ec("p256");
            const key = elliptic.genKeyPair();
            const privateKey = key.getPrivate().toBuffer("be");
            const publicKey = Buffer.from(key.getPublic().encode("array", false));
            return {
                curve: namedCurve,
                privateKey,
                publicKey,
            };
        }
        case const_1.NamedCurveAlgorithm.x25519: {
            const keys = nacl.box.keyPair();
            return {
                curve: namedCurve,
                privateKey: Buffer.from(keys.secretKey.buffer),
                publicKey: Buffer.from(keys.publicKey.buffer),
            };
        }
        default:
            throw new Error();
    }
}
exports.generateKeyPair = generateKeyPair;
//# sourceMappingURL=namedCurve.js.map