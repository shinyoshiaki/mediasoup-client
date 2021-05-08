/// <reference types="node" />
export declare class DtlsPlaintextHeader {
    contentType: number;
    protocolVersion: {
        major: number;
        minor: number;
    };
    epoch: number;
    sequenceNumber: number;
    contentLen: number;
    static readonly spec: {
        contentType: any;
        protocolVersion: {
            major: any;
            minor: any;
        };
        epoch: any;
        sequenceNumber: any;
        contentLen: any;
    };
    constructor(contentType: number, protocolVersion: {
        major: number;
        minor: number;
    }, epoch: number, sequenceNumber: number, contentLen: number);
    static createEmpty(): DtlsPlaintextHeader;
    static deSerialize(buf: Buffer): DtlsPlaintextHeader;
    serialize(): Buffer;
}
export declare class MACHeader {
    epoch: number;
    sequenceNumber: number;
    contentType: number;
    protocolVersion: {
        major: number;
        minor: number;
    };
    contentLen: number;
    static readonly spec: {
        epoch: any;
        sequenceNumber: any;
        contentType: any;
        protocolVersion: {
            major: any;
            minor: any;
        };
        contentLen: any;
    };
    constructor(epoch: number, sequenceNumber: number, contentType: number, protocolVersion: {
        major: number;
        minor: number;
    }, contentLen: number);
    static createEmpty(): MACHeader;
    static deSerialize(buf: Buffer): MACHeader;
    serialize(): Buffer;
}
