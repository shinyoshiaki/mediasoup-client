/// <reference types="node" />
import { ATTRIBUTES, classes, methods } from "./const";
export declare function parseMessage(data: Buffer, integrityKey?: Buffer): Message | undefined;
export declare class Message {
    messageMethod: methods;
    messageClass: classes;
    transactionId: Buffer;
    attributes: {
        [key in typeof ATTRIBUTES[number]]?: any;
    };
    constructor(messageMethod: methods, messageClass: classes, transactionId?: Buffer, attributes?: {
        [key in typeof ATTRIBUTES[number]]?: any;
    });
    get attributesKeys(): typeof ATTRIBUTES[number][];
    get transactionIdHex(): string;
    get bytes(): Buffer;
    addFingerprint(): void;
    addMessageIntegrity(key: Buffer): void;
}
