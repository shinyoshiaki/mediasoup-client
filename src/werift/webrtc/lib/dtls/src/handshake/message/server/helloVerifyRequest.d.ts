/// <reference types="node" />
import { HandshakeType } from "../../const";
import { Handshake } from "../../../typings/domain";
import { FragmentedHandshake } from "../../../record/message/fragment";
export declare class ServerHelloVerifyRequest implements Handshake {
    serverVersion: {
        major: number;
        minor: number;
    };
    cookie: Buffer;
    msgType: HandshakeType;
    messageSeq?: number;
    static readonly spec: {
        serverVersion: {
            major: any;
            minor: any;
        };
        cookie: any;
    };
    constructor(serverVersion: {
        major: number;
        minor: number;
    }, cookie: Buffer);
    static createEmpty(): ServerHelloVerifyRequest;
    static deSerialize(buf: Buffer): ServerHelloVerifyRequest;
    serialize(): Buffer;
    get version(): {
        major: number;
        minor: number;
    };
    toFragment(): FragmentedHandshake;
}
