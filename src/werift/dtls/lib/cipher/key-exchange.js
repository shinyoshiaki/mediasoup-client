"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createECDHEPSKKeyExchange = exports.createPSKKeyExchange = exports.createNULLKeyExchange = exports.createECDHEECDSAKeyExchange = exports.createECDHERSAKeyExchange = exports.createRSAKeyExchange = exports.KeyExchange = void 0;
const signTypes = {
    NULL: 0,
    ECDHE: 1,
};
const keyTypes = {
    NULL: 0,
    RSA: 1,
    ECDSA: 2,
    PSK: 3,
};
const kxTypes = {
    NULL: 0,
    RSA: 1,
    ECDHE_RSA: 2,
    ECDHE_ECDSA: 3,
    PSK: 4,
    ECDHE_PSK: 5,
};
/**
 * This class represent type of key exchange mechanism.
 */
class KeyExchange {
    constructor() {
        this.id = 0;
    }
    /**
     * @returns {string}
     */
    toString() {
        return this.name;
    }
}
exports.KeyExchange = KeyExchange;
/**
 * Creates `RSA` key exchange.
 * @returns {KeyExchange}
 */
function createRSAKeyExchange() {
    const exchange = new KeyExchange();
    exchange.id = kxTypes.RSA;
    exchange.name = "RSA";
    exchange.keyType = keyTypes.RSA;
    return exchange;
}
exports.createRSAKeyExchange = createRSAKeyExchange;
/**
 * Creates `ECDHE_RSA` key exchange.
 * @returns {KeyExchange}
 */
function createECDHERSAKeyExchange() {
    const exchange = new KeyExchange();
    exchange.id = kxTypes.ECDHE_RSA;
    exchange.name = "ECDHE_RSA";
    exchange.signType = signTypes.ECDHE;
    exchange.keyType = keyTypes.RSA;
    return exchange;
}
exports.createECDHERSAKeyExchange = createECDHERSAKeyExchange;
/**
 * Creates `ECDHE_ECDSA` key exchange.
 * @returns {KeyExchange}
 */
function createECDHEECDSAKeyExchange() {
    const exchange = new KeyExchange();
    exchange.id = kxTypes.ECDHE_ECDSA;
    exchange.name = "ECDHE_ECDSA";
    exchange.signType = signTypes.ECDHE;
    exchange.keyType = keyTypes.ECDSA;
    return exchange;
}
exports.createECDHEECDSAKeyExchange = createECDHEECDSAKeyExchange;
/**
 * Creates `NULL` key exchange.
 * @returns {KeyExchange}
 */
function createNULLKeyExchange() {
    const exchange = new KeyExchange();
    exchange.id = kxTypes.NULL;
    exchange.name = "NULL";
    exchange.signType = signTypes.NULL;
    exchange.keyType = keyTypes.NULL;
    return exchange;
}
exports.createNULLKeyExchange = createNULLKeyExchange;
/**
 * Creates `PSK` key exchange.
 * @returns {KeyExchange}
 */
function createPSKKeyExchange() {
    const exchange = new KeyExchange();
    exchange.id = kxTypes.PSK;
    exchange.name = "PSK";
    exchange.signType = signTypes.NULL;
    exchange.keyType = keyTypes.PSK;
    return exchange;
}
exports.createPSKKeyExchange = createPSKKeyExchange;
/**
 * Creates `ECDHE_PSK` key exchange.
 * @returns {KeyExchange}
 */
function createECDHEPSKKeyExchange() {
    const exchange = new KeyExchange();
    exchange.id = kxTypes.ECDHE_PSK;
    exchange.name = "ECDHE_PSK";
    exchange.signType = signTypes.ECDHE;
    exchange.keyType = keyTypes.PSK;
    return exchange;
}
exports.createECDHEPSKKeyExchange = createECDHEPSKKeyExchange;
//# sourceMappingURL=key-exchange.js.map