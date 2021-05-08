/// <reference types="node" />
import { HandshakeType } from "../../const";
import { Handshake } from "../../../typings/domain";
import { FragmentedHandshake } from "../../../record/message/fragment";
export declare class ClientKeyExchange implements Handshake {
    publicKey: Buffer;
    msgType: HandshakeType;
    messageSeq?: number;
    static readonly spec: {
        publicKey: any;
    };
    constructor(publicKey: Buffer);
    static createEmpty(): ClientKeyExchange;
    static deSerialize(buf: Buffer): ClientKeyExchange;
    serialize(): Buffer;
    toFragment(): FragmentedHandshake;
}
