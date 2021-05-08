/// <reference types="node" />
import Cipher, { CipherHeader } from "./abstract";
/**
 * This class implements AEAD cipher family.
 */
export default class AEADCipher extends Cipher {
    keyLength: number;
    nonceLength: number;
    ivLength: number;
    authTagLength: number;
    nonceImplicitLength: number;
    nonceExplicitLength: number;
    clientWriteKey?: Buffer;
    serverWriteKey?: Buffer;
    clientNonce?: Buffer;
    serverNonce?: Buffer;
    constructor();
    init(masterSecret: Buffer, serverRandom: Buffer, clientRandom: Buffer): void;
    /**
     * Encrypt message.
     */
    encrypt(type: number, data: Buffer, header: CipherHeader): Buffer;
    /**
     * Decrypt message.
     */
    decrypt(type: number, data: Buffer, header: CipherHeader): Buffer;
}
