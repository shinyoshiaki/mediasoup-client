/// <reference types="node" />
import { HandshakeType } from "../const";
import { Handshake } from "../../typings/domain";
import { FragmentedHandshake } from "../../record/message/fragment";
export declare class Certificate implements Handshake {
    certificateList: Buffer[];
    msgType: HandshakeType;
    messageSeq?: number;
    static readonly spec: {
        certificateList: any;
    };
    constructor(certificateList: Buffer[]);
    static createEmpty(): Certificate;
    static deSerialize(buf: Buffer): Certificate;
    serialize(): Buffer;
    toFragment(): FragmentedHandshake;
}
