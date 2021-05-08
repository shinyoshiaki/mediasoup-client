/// <reference types="node" />
import { HandshakeType } from "../../const";
import { Version, Random, Handshake, Extension } from "../../../typings/domain";
import { FragmentedHandshake } from "../../../record/message/fragment";
import { CipherSuites } from "../../../cipher/const";
export declare class ServerHello implements Handshake {
    serverVersion: Version;
    random: Random;
    sessionId: Buffer;
    cipherSuite: CipherSuites;
    compressionMethod: number;
    extensions: Extension[];
    msgType: HandshakeType;
    messageSeq?: number;
    static readonly spec: {
        serverVersion: {
            major: number;
            minor: number;
        };
        random: {
            gmt_unix_time: number;
            random_bytes: any;
        };
        sessionId: any;
        cipherSuite: number;
        compressionMethod: number;
    };
    constructor(serverVersion: Version, random: Random, sessionId: Buffer, cipherSuite: CipherSuites, compressionMethod: number, extensions: Extension[]);
    static createEmpty(): ServerHello;
    static deSerialize(buf: Buffer): ServerHello;
    serialize(): Buffer;
    toFragment(): FragmentedHandshake;
}
