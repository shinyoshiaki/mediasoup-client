"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const abstract_1 = tslib_1.__importDefault(require("./abstract"));
const key_exchange_1 = require("../key-exchange");
/**
 * Default passthrough cipher.
 */
class NullCipher extends abstract_1.default {
    /**
     * @class NullCipher
     */
    constructor() {
        super();
        this.name = "NULL_NULL_NULL"; // key, mac, hash
        this.blockAlgorithm = "NULL";
        this.kx = key_exchange_1.createNULLKeyExchange();
        this.hash = "NULL";
    }
    /**
     * Encrypts data.
     * @param {AbstractSession} session
     * @param {Buffer} data Content to encryption.
     * @returns {Buffer}
     */
    encrypt(session, data) {
        return data;
    }
    /**
     * Decrypts data.
     * @param {AbstractSession} session
     * @param {Buffer} data Content to encryption.
     * @returns {Buffer}
     */
    decrypt(session, data) {
        return data;
    }
}
exports.default = NullCipher;
//# sourceMappingURL=null.js.map