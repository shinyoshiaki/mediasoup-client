/// <reference types="node" />
import { PrivateKey } from "@fidm/x509";
import { CipherSuites, NamedCurveAlgorithms, SignatureHash } from "../cipher/const";
import { NamedCurveKeyPair } from "../cipher/namedCurve";
import { SessionTypes } from "../cipher/suites/abstract";
import AEADCipher from "../cipher/suites/aead";
import { DtlsRandom } from "../handshake/random";
import { DtlsPlaintext } from "../record/message/plaintext";
export declare class CipherContext {
    sessionType: SessionTypes;
    certPem?: string | undefined;
    keyPem?: string | undefined;
    localRandom: DtlsRandom;
    remoteRandom: DtlsRandom;
    cipherSuite: CipherSuites;
    remoteCertificate?: Buffer;
    remoteKeyPair: Partial<NamedCurveKeyPair>;
    localKeyPair: NamedCurveKeyPair;
    masterSecret: Buffer;
    cipher: AEADCipher;
    namedCurve: NamedCurveAlgorithms;
    signatureHashAlgorithm?: SignatureHash;
    localCert: Buffer;
    localPrivateKey: PrivateKey;
    constructor(sessionType: SessionTypes, certPem?: string | undefined, keyPem?: string | undefined, signatureHashAlgorithm?: SignatureHash);
    /**
     *
     * @param signatureHash
     * @param namedCurveAlgorithm necessary when use ecdsa
     * @returns
     */
    static createSelfSignedCertificateWithKey(signatureHash: SignatureHash, namedCurveAlgorithm?: NamedCurveAlgorithms): Promise<{
        certPem: string;
        keyPem: string;
        signatureHash: SignatureHash;
    }>;
    encryptPacket(pkt: DtlsPlaintext): DtlsPlaintext;
    decryptPacket(pkt: DtlsPlaintext): Buffer;
    verifyData(buf: Buffer): Buffer;
    signatureData(data: Buffer, hash: string): Buffer;
    generateKeySignature(hashAlgorithm: string): Buffer;
    parseX509(certPem: string, keyPem: string, signatureHash: SignatureHash): void;
    private valueKeySignature;
}
