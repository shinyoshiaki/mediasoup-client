/// <reference types="node" />
import Event from "rx.mini";
import { DtlsSocket } from "../../../dtls/src";
import { SignatureHash } from "../../../dtls/src/cipher/const";
import { RtcpPacket, RtpHeader, SrtcpSession, SrtpSession } from "../../../rtp/src";
import { RtpRouter } from "../media/router";
import { RTCIceTransport } from "./ice";
export declare class RTCDtlsTransport {
    readonly iceTransport: RTCIceTransport;
    readonly router: RtpRouter;
    readonly certificates: RTCCertificate[];
    private readonly srtpProfiles;
    state: DtlsState;
    role: DtlsRole;
    srtpStarted: boolean;
    transportSequenceNumber: number;
    dataReceiver?: (buf: Buffer) => void;
    dtls?: DtlsSocket;
    srtp: SrtpSession;
    srtcp: SrtcpSession;
    readonly onStateChange: Event<["closed" | "failed" | "new" | "connecting" | "connected"]>;
    private localCertificate?;
    constructor(iceTransport: RTCIceTransport, router: RtpRouter, certificates: RTCCertificate[], srtpProfiles?: number[]);
    get localParameters(): RTCDtlsParameters;
    setupCertificate(): Promise<void>;
    start(remoteParameters: RTCDtlsParameters): Promise<void>;
    startSrtp(): void;
    readonly sendData: (data: Buffer) => Promise<void>;
    sendRtp(payload: Buffer, header: RtpHeader): number;
    sendRtcp(packets: RtcpPacket[]): Promise<void>;
    private setState;
    stop(): Promise<void>;
}
export declare const DtlsStates: readonly ["new", "connecting", "connected", "closed", "failed"];
export declare type DtlsState = typeof DtlsStates[number];
export declare type DtlsRole = "auto" | "server" | "client";
export declare class RTCCertificate {
    certPem: string;
    signatureHash: SignatureHash;
    publicKey: string;
    privateKey: string;
    constructor(privateKeyPem: string, certPem: string, signatureHash: SignatureHash);
    getFingerprints(): RTCDtlsFingerprint[];
}
export declare class RTCDtlsFingerprint {
    algorithm: string;
    value: string;
    constructor(algorithm: string, value: string);
}
export declare class RTCDtlsParameters {
    fingerprints: RTCDtlsFingerprint[];
    role: "auto" | "client" | "server";
    constructor(fingerprints: RTCDtlsFingerprint[], role: "auto" | "client" | "server");
}
