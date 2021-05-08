/// <reference types="node" />
import { HashAlgorithms, SignatureAlgorithms } from "../../cipher/const";
export declare class Signature {
    static type: number;
    static readonly spec: {
        type: any;
        data: any;
    };
    type: number;
    data: {
        hash: HashAlgorithms;
        signature: SignatureAlgorithms;
    }[];
    constructor(props?: Partial<Signature>);
    static createEmpty(): Signature;
    static deSerialize(buf: Buffer): Signature;
    serialize(): Buffer;
    static fromData(buf: Buffer): Signature;
    get extension(): {
        type: number;
        data: Buffer;
    };
}
