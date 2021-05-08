"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionType = void 0;
exports.SessionType = {
    CLIENT: 1,
    SERVER: 2,
};
class AbstractCipher {
    constructor() {
        this.id = 0;
        this.verifyDataLength = 12;
    }
    /**
     * Init cipher.
     * @abstract
     */
    init(...args) {
        throw new Error("not implemented");
    }
    /**
     * Encrypts data.
     * @abstract
     */
    encrypt(...args) {
        throw new Error("not implemented");
    }
    /**
     * Decrypts data.
     * @abstract
     */
    decrypt(...args) {
        throw new Error("not implemented");
    }
    /**
     * @returns {string}
     */
    toString() {
        return this.name;
    }
}
exports.default = AbstractCipher;
//# sourceMappingURL=abstract.js.map