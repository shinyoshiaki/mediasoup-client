/// <reference types="node" />
export declare class VP8 {
    x: number;
    n: number;
    s: number;
    pid: number;
    i: number;
    l: number;
    t: number;
    k: number;
    pictureId: number;
    tloPicIdx: number;
    payload: Buffer;
    static payLoader(mtu: number, payload: Buffer): Buffer[];
    static deSerialize(payload: Buffer): VP8;
    static isPartitionHead(packet: Buffer): boolean;
}
