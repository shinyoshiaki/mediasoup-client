/// <reference types="node" />
export declare type Extension = {
    id: number;
    payload: Buffer;
};
export declare class RtpHeader {
    version: number;
    padding: boolean;
    paddingSize: number;
    extension: boolean;
    marker: boolean;
    payloadOffset: number;
    payloadType: number;
    sequenceNumber: number;
    timestamp: number;
    ssrc: number;
    csrc: number[];
    extensionProfile: number;
    /**deserialize only */
    extensionLength?: number;
    extensions: Extension[];
    constructor(props?: Partial<RtpHeader>);
    static deSerialize(rawPacket: Buffer): RtpHeader;
    get serializeSize(): number;
    serialize(size: number): Buffer;
}
export declare class RtpPacket {
    header: RtpHeader;
    payload: Buffer;
    constructor(header: RtpHeader, payload: Buffer);
    get serializeSize(): number;
    serialize(): Buffer;
    static deSerialize(buf: Buffer): RtpPacket;
}
