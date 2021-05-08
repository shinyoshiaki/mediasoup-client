/// <reference types="node" />
import { Extension } from "../../typings/domain";
export declare class EllipticCurves {
    static type: number;
    static readonly spec: {
        type: any;
        data: any;
    };
    type: number;
    data: number[];
    constructor(props?: Partial<EllipticCurves>);
    static createEmpty(): EllipticCurves;
    static fromData(buf: Buffer): EllipticCurves;
    static deSerialize(buf: Buffer): EllipticCurves;
    serialize(): Buffer;
    get extension(): Extension;
}
