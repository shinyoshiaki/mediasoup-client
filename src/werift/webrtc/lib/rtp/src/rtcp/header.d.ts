/// <reference types="node" />
export declare const HEADER_SIZE = 4;
export declare class RtcpHeader {
    version: number;
    padding: boolean;
    count: number;
    type: number;
    length: number;
    constructor(props?: Partial<RtcpHeader>);
    serialize(): Buffer;
    static deSerialize(buf: Buffer): RtcpHeader;
}
