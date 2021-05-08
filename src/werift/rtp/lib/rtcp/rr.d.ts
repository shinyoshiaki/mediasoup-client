/// <reference types="node" />
export declare class RtcpRrPacket {
    ssrc: number;
    reports: RtcpReceiverInfo[];
    static type: number;
    type: number;
    constructor(props?: Partial<RtcpRrPacket>);
    serialize(): Buffer;
    static deSerialize(data: Buffer, count: number): RtcpRrPacket;
}
export declare class RtcpReceiverInfo {
    ssrc: number;
    fractionLost: number;
    packetsLost: number;
    highestSequence: number;
    jitter: number;
    lsr: number;
    dlsr: number;
    constructor(props?: Partial<RtcpReceiverInfo>);
    serialize(): Buffer;
    static deSerialize(data: Buffer): RtcpReceiverInfo;
}
