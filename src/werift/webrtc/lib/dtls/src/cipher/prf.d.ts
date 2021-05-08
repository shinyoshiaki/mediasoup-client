/// <reference types="node" />
import { NamedCurveAlgorithms } from "./const";
export declare function prfPreMasterSecret(publicKey: Buffer, privateKey: Buffer, curve: NamedCurveAlgorithms): Buffer;
export declare function hmac(algorithm: string, secret: Buffer, data: Buffer): Buffer;
export declare function prfPHash(secret: Buffer, seed: Buffer, requestedLegth: number, algorithm?: string): Buffer;
export declare function prfMasterSecret(preMasterSecret: Buffer, clientRandom: Buffer, serverRandom: Buffer): Buffer;
export declare function prfExtendedMasterSecret(preMasterSecret: Buffer, handshakes: Buffer): Buffer;
export declare function exportKeyingMaterial(label: string, length: number, masterSecret: Buffer, localRandom: Buffer, remoteRandom: Buffer, isClient: boolean): Buffer;
export declare function hash(algorithm: string, data: Buffer): Buffer;
export declare function prfVerifyData(masterSecret: Buffer, handshakes: Buffer, label: string, size?: number): Buffer;
export declare function prfVerifyDataClient(masterSecret: Buffer, handshakes: Buffer): Buffer;
export declare function prfVerifyDataServer(masterSecret: Buffer, handshakes: Buffer): Buffer;
export declare function prfEncryptionKeys(masterSecret: Buffer, clientRandom: Buffer, serverRandom: Buffer, prfKeyLen: number, prfIvLen: number, prfNonceLen: number, algorithm?: string): {
    clientWriteKey: any;
    serverWriteKey: any;
    clientNonce: Buffer;
    serverNonce: Buffer;
};
