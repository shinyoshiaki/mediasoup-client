"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pHash = exports.hmac = void 0;
const tslib_1 = require("tslib");
const crypto = tslib_1.__importStar(require("crypto"));
/**
 * Culculates HMAC using provided hash.
 * @param {string} algorithm - Hash algorithm.
 * @param {Buffer} secret - Hmac seed.
 * @param {Buffer} data - Input data.
 * @returns {Buffer}
 */
function hmac(algorithm, secret, data) {
    const hash = crypto.createHmac(algorithm, secret);
    hash.update(data);
    return hash.digest();
}
exports.hmac = hmac;
/**
 * A data expansion function for PRF.
 * @param {number} bytes - The number of bytes required by PRF.
 * @param {string} algorithm - Hmac hash algorithm.
 * @param {Buffer} secret - Hmac secret.
 * @param {Buffer} seed - Input data.
 * @returns {Buffer}
 */
function pHash(bytes, algorithm, secret, seed) {
    const totalLength = bytes;
    const bufs = [];
    let Ai = seed; // A0
    do {
        Ai = hmac(algorithm, secret, Ai); // A(i) = HMAC(secret, A(i-1))
        const output = hmac(algorithm, secret, Buffer.concat([Ai, seed]));
        bufs.push(output);
        bytes -= output.length; // eslint-disable-line no-param-reassign
    } while (bytes > 0);
    return Buffer.concat(bufs, totalLength);
}
exports.pHash = pHash;
//# sourceMappingURL=utils.js.map