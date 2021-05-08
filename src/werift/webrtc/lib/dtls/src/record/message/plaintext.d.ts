/// <reference types="node" />
export declare class DtlsPlaintext {
    recordLayerHeader: typeof DtlsPlaintext.spec.recordLayerHeader;
    fragment: Buffer;
    static readonly spec: {
        recordLayerHeader: {
            contentType: any;
            protocolVersion: {
                major: any;
                minor: any;
            };
            epoch: any;
            sequenceNumber: any;
            contentLen: any;
        };
        fragment: any;
    };
    constructor(recordLayerHeader: typeof DtlsPlaintext.spec.recordLayerHeader, fragment: Buffer);
    static createEmpty(): DtlsPlaintext;
    static deSerialize(buf: Buffer): DtlsPlaintext;
    serialize(): Buffer;
    computeMACHeader(): Buffer;
}
