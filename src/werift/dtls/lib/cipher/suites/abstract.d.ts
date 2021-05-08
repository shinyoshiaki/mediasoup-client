/// <reference types="node" />
import { KeyExchange } from "../key-exchange";
export declare type CipherHeader = {
    type: number;
    version: number;
    epoch: number;
    sequenceNumber: number;
};
export declare const SessionType: {
    readonly CLIENT: 1;
    readonly SERVER: 2;
};
export declare type SessionTypes = typeof SessionType[keyof typeof SessionType];
export default abstract class AbstractCipher {
    id: number;
    name?: string;
    hash?: string;
    verifyDataLength: number;
    blockAlgorithm?: string;
    kx?: KeyExchange;
    /**
     * Init cipher.
     * @abstract
     */
    init(...args: any): void;
    /**
     * Encrypts data.
     * @abstract
     */
    encrypt(...args: any): Buffer;
    /**
     * Decrypts data.
     * @abstract
     */
    decrypt(...args: any): Buffer;
    /**
     * @returns {string}
     */
    toString(): string | undefined;
}
