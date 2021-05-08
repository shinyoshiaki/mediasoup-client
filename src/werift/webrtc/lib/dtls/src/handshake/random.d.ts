/// <reference types="node" />
export declare class DtlsRandom {
    gmt_unix_time: number;
    random_bytes: Buffer;
    static readonly spec: {
        gmt_unix_time: any;
        random_bytes: any;
    };
    constructor(gmt_unix_time?: number, random_bytes?: Buffer);
    static deSerialize(buf: Buffer): DtlsRandom;
    static from(spec: typeof DtlsRandom.spec): DtlsRandom;
    serialize(): Buffer;
}
