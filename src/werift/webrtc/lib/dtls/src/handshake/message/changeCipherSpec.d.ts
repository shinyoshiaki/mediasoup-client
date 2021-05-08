/// <reference types="node" />
export declare class ChangeCipherSpec {
    type: number;
    static readonly spec: {
        type: any;
    };
    constructor(type?: number);
    static createEmpty(): ChangeCipherSpec;
    static deSerialize(buf: Buffer): ChangeCipherSpec;
    serialize(): Buffer;
}
