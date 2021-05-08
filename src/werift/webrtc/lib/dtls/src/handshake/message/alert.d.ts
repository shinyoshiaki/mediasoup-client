/// <reference types="node" />
export declare class Alert {
    level: number;
    description: number;
    static readonly spec: {
        level: any;
        description: any;
    };
    constructor(level: number, description: number);
    static deSerialize(buf: Buffer): Alert;
    serialize(): Buffer;
}
