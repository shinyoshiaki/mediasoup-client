/// <reference types="node" />
export declare class DtlsPlaintext {
    recordLayerHeader: typeof DtlsPlaintext.spec.recordLayerHeader;
    fragment: Buffer;
    static readonly spec: {
        recordLayerHeader: {
            contentType: number;
            protocolVersion: {
                major: number;
                minor: number;
            };
            epoch: number;
            sequenceNumber: number;
            contentLen: number;
        };
        fragment: any;
    };
    constructor(recordLayerHeader: typeof DtlsPlaintext.spec.recordLayerHeader, fragment: Buffer);
    static createEmpty(): DtlsPlaintext;
    static deSerialize(buf: Buffer): DtlsPlaintext;
    serialize(): Buffer;
    computeMACHeader(): Buffer;
}
