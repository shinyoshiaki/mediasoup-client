/// <reference types="node" />
export declare class OutgoingSSNResetRequestParam {
    requestSequence: number;
    responseSequence: number;
    lastTsn: number;
    streams: number[];
    static type: number;
    constructor(requestSequence: number, responseSequence: number, lastTsn: number, streams: number[]);
    get type(): number;
    get bytes(): Buffer;
    static parse(data: Buffer): OutgoingSSNResetRequestParam;
}
export declare class StreamAddOutgoingParam {
    requestSequence: number;
    newStreams: number;
    static type: number;
    constructor(requestSequence: number, newStreams: number);
    get type(): number;
    get bytes(): Buffer;
    static parse(data: Buffer): StreamAddOutgoingParam;
}
export declare const reconfigResult: {
    readonly ReconfigResultSuccessPerformed: 1;
    readonly BadSequenceNumber: 5;
};
declare type ReconfigResult = typeof reconfigResult[keyof typeof reconfigResult];
export declare class ReconfigResponseParam {
    responseSequence: number;
    result: ReconfigResult;
    static type: number;
    constructor(responseSequence: number, result: ReconfigResult);
    get type(): number;
    get bytes(): Buffer;
    static parse(data: Buffer): ReconfigResponseParam;
}
export declare type StreamParam = OutgoingSSNResetRequestParam | StreamAddOutgoingParam | ReconfigResponseParam;
export declare type StreamParamType = typeof OutgoingSSNResetRequestParam | typeof StreamAddOutgoingParam | typeof ReconfigResponseParam;
export declare const RECONFIG_PARAM_BY_TYPES: {
    [type: number]: StreamParamType;
};
export {};
