/// <reference types="node" />
import { HandshakeType } from "../../const";
import { Handshake } from "../../../typings/domain";
import { FragmentedHandshake } from "../../../record/message/fragment";
import { HashAlgorithms, SignatureAlgorithms } from "../../../cipher/const";
export declare class ServerCertificateRequest implements Handshake {
    certificateTypes: number[];
    signatures: {
        hash: HashAlgorithms;
        signature: SignatureAlgorithms;
    }[];
    authorities: number[];
    msgType: HandshakeType;
    messageSeq?: number;
    static readonly spec: {
        certificateTypes: any;
        signatures: any;
        authorities: any;
    };
    constructor(certificateTypes: number[], signatures: {
        hash: HashAlgorithms;
        signature: SignatureAlgorithms;
    }[], authorities: number[]);
    static createEmpty(): ServerCertificateRequest;
    static deSerialize(buf: Buffer): ServerCertificateRequest;
    serialize(): Buffer;
    toFragment(): FragmentedHandshake;
}
