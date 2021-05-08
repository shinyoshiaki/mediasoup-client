/// <reference types="node" />
import { Handshake } from "../../typings/domain";
import { HandshakeType } from "../const";
import { FragmentedHandshake } from "../../record/message/fragment";
export declare class Finished implements Handshake {
    verifyData: Buffer;
    msgType: HandshakeType;
    messageSeq?: number;
    constructor(verifyData: Buffer);
    static createEmpty(): Finished;
    static deSerialize(buf: Buffer): Finished;
    serialize(): Buffer;
    toFragment(): FragmentedHandshake;
}
