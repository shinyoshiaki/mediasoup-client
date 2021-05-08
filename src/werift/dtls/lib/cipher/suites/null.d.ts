/// <reference types="node" />
import Cipher from "./abstract";
/**
 * Default passthrough cipher.
 */
export default class NullCipher extends Cipher {
    /**
     * @class NullCipher
     */
    constructor();
    /**
     * Encrypts data.
     * @param {AbstractSession} session
     * @param {Buffer} data Content to encryption.
     * @returns {Buffer}
     */
    encrypt(session: any, data: Buffer): Buffer;
    /**
     * Decrypts data.
     * @param {AbstractSession} session
     * @param {Buffer} data Content to encryption.
     * @returns {Buffer}
     */
    decrypt(session: any, data: Buffer): Buffer;
}
