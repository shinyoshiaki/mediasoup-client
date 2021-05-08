/// <reference types="node" />
import { HandshakeType } from "../../const";
import { Handshake } from "../../../typings/domain";
import { FragmentedHandshake } from "../../../record/message/fragment";
export declare class ServerHelloDone implements Handshake {
    msgType: HandshakeType;
    messageSeq?: number;
    static readonly spec: {};
    static createEmpty(): ServerHelloDone;
    static deSerialize(buf: Buffer): ServerHelloDone;
    serialize(): Buffer;
    toFragment(): FragmentedHandshake;
}
