"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const crypto = tslib_1.__importStar(require("crypto"));
const abstract_1 = tslib_1.__importStar(require("./abstract"));
const prf_1 = require("../prf");
const { createDecode, encode, types: { uint8, uint16be, uint48be }, } = require("binary-data");
const ContentType = uint8;
const ProtocolVersion = uint16be;
const AEADAdditionalData = {
    epoch: uint16be,
    sequence: uint48be,
    type: ContentType,
    version: ProtocolVersion,
    length: uint16be,
};
/**
 * This class implements AEAD cipher family.
 */
class AEADCipher extends abstract_1.default {
    constructor() {
        super();
        this.keyLength = 0;
        this.nonceLength = 0;
        this.ivLength = 0;
        this.authTagLength = 0;
        this.nonceImplicitLength = 0;
        this.nonceExplicitLength = 0;
    }
    init(masterSecret, serverRandom, clientRandom) {
        const keys = prf_1.prfEncryptionKeys(masterSecret, clientRandom, serverRandom, this.keyLength, this.ivLength, this.nonceLength, this.hash);
        keys;
        this.clientWriteKey = keys.clientWriteKey;
        this.serverWriteKey = keys.serverWriteKey;
        this.clientNonce = keys.clientNonce;
        this.serverNonce = keys.serverNonce;
    }
    /**
     * Encrypt message.
     */
    encrypt(type, data, header) {
        const isClient = type === abstract_1.SessionType.CLIENT;
        const iv = isClient ? this.clientNonce : this.serverNonce;
        const writeKey = isClient ? this.clientWriteKey : this.serverWriteKey;
        if (!iv || !writeKey)
            throw new Error();
        iv.writeUInt16BE(header.epoch, this.nonceImplicitLength);
        iv.writeUIntBE(header.sequenceNumber, this.nonceImplicitLength + 2, 6);
        const explicitNonce = iv.slice(this.nonceImplicitLength);
        const additionalData = {
            epoch: header.epoch,
            sequence: header.sequenceNumber,
            type: header.type,
            version: header.version,
            length: data.length,
        };
        const additionalBuffer = encode(additionalData, AEADAdditionalData).slice();
        const cipher = crypto.createCipheriv(this.blockAlgorithm, writeKey, iv, {
            authTagLength: this.authTagLength,
        });
        cipher.setAAD(additionalBuffer, {
            plaintextLength: data.length,
        });
        const headPart = cipher.update(data);
        const finalPart = cipher.final();
        const authtag = cipher.getAuthTag();
        return Buffer.concat([explicitNonce, headPart, finalPart, authtag]);
    }
    /**
     * Decrypt message.
     */
    decrypt(type, data, header) {
        const isClient = type === abstract_1.SessionType.CLIENT;
        const iv = isClient ? this.serverNonce : this.clientNonce;
        const writeKey = isClient ? this.serverWriteKey : this.clientWriteKey;
        if (!iv || !writeKey)
            throw new Error();
        const final = createDecode(data);
        const explicitNonce = final.readBuffer(this.nonceExplicitLength);
        explicitNonce.copy(iv, this.nonceImplicitLength);
        const encrypted = final.readBuffer(final.length - this.authTagLength);
        const authTag = final.readBuffer(this.authTagLength);
        const additionalData = {
            epoch: header.epoch,
            sequence: header.sequenceNumber,
            type: header.type,
            version: header.version,
            length: encrypted.length,
        };
        const additionalBuffer = encode(additionalData, AEADAdditionalData).slice();
        const decipher = crypto.createDecipheriv(this.blockAlgorithm, writeKey, iv, {
            authTagLength: this.authTagLength,
        });
        decipher.setAuthTag(authTag);
        decipher.setAAD(additionalBuffer, {
            plaintextLength: encrypted.length,
        });
        const headPart = decipher.update(encrypted);
        const finalPart = decipher.final();
        return finalPart.length > 0
            ? Buffer.concat([headPart, finalPart])
            : headPart;
    }
}
exports.default = AEADCipher;
//# sourceMappingURL=aead.js.map