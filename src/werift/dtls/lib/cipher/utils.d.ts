/// <reference types="node" />
/**
 * Culculates HMAC using provided hash.
 * @param {string} algorithm - Hash algorithm.
 * @param {Buffer} secret - Hmac seed.
 * @param {Buffer} data - Input data.
 * @returns {Buffer}
 */
declare function hmac(algorithm: string, secret: Buffer, data: Buffer): Buffer;
/**
 * A data expansion function for PRF.
 * @param {number} bytes - The number of bytes required by PRF.
 * @param {string} algorithm - Hmac hash algorithm.
 * @param {Buffer} secret - Hmac secret.
 * @param {Buffer} seed - Input data.
 * @returns {Buffer}
 */
declare function pHash(bytes: number, algorithm: string, secret: Buffer, seed: Buffer): Buffer;
export { hmac, pHash };
