/// <reference types="node" />
export declare class Context {
    masterKey: Buffer;
    masterSalt: Buffer;
    profile: number;
    srtpSSRCStates: {
        [key: number]: SrtpSSRCState;
    };
    srtpSessionKey: Buffer;
    srtpSessionSalt: Buffer;
    srtpSessionAuthTag: Buffer;
    srtpSessionAuth: import("crypto").Hmac;
    srtcpSSRCStates: {
        [key: number]: SrtcpSSRCState;
    };
    srtcpSessionKey: Buffer;
    srtcpSessionSalt: Buffer;
    srtcpSessionAuthTag: Buffer;
    srtcpSessionAuth: import("crypto").Hmac;
    constructor(masterKey: Buffer, masterSalt: Buffer, profile: number);
    generateSessionKey(label: number): Buffer;
    generateSessionSalt(label: number): Buffer;
    generateSessionAuthTag(label: number): Buffer;
    getSRTPSRRCState(ssrc: number): SrtpSSRCState;
    getSRTCPSSRCState(ssrc: number): SrtcpSSRCState;
    updateRolloverCount(sequenceNumber: number, s: SrtpSSRCState): void;
    generateCounter(sequenceNumber: number, rolloverCounter: number, ssrc: number, sessionSalt: Buffer): Buffer;
    generateSrtpAuthTag(buf: Buffer, roc: number): Buffer;
    generateSrtcpAuthTag(buf: Buffer): Buffer;
    index(ssrc: number): number;
    setIndex(ssrc: number, index: number): void;
}
export declare type SrtpSSRCState = {
    ssrc: number;
    rolloverCounter: number;
    rolloverHasProcessed?: boolean;
    lastSequenceNumber: number;
};
export declare type SrtcpSSRCState = {
    srtcpIndex: number;
    ssrc: number;
};
