import { Kind } from "./types/domain";
import { RTCRtpParameters, RTCRtpSimulcastParameters } from "./media/parameters";
import { Direction } from "./media/rtpTransceiver";
import { DtlsRole, RTCDtlsFingerprint, RTCDtlsParameters } from "./transport/dtls";
import { RTCIceCandidate, RTCIceParameters } from "./transport/ice";
import { RTCSctpCapabilities } from "./transport/sctp";
export declare class SessionDescription {
    version: number;
    origin?: string;
    name: string;
    time: string;
    host?: string;
    group: GroupDescription[];
    msidSemantic: GroupDescription[];
    media: MediaDescription[];
    type: "offer" | "answer";
    dtlsRole: DtlsRole;
    iceOptions: string;
    iceLite: boolean;
    icePassword: string;
    iceUsernameFragment: string;
    dtlsFingerprints: RTCDtlsFingerprint[];
    static parse(sdp: string): SessionDescription;
    webrtcTrackId(media: MediaDescription): string | undefined;
    toString(): string;
    toJSON(): RTCSessionDescription;
}
export declare class MediaDescription {
    kind: Kind;
    port: number;
    profile: string;
    fmt: string[] | number[];
    host?: string;
    direction?: Direction;
    msid?: string;
    rtcpPort?: number;
    rtcpHost?: string;
    rtcpMux: boolean;
    ssrc: SsrcDescription[];
    ssrcGroup: GroupDescription[];
    rtp: RTCRtpParameters;
    sctpCapabilities?: RTCSctpCapabilities;
    sctpMap: {
        [key: number]: string;
    };
    sctpPort?: number;
    dtlsParams?: RTCDtlsParameters;
    iceParams?: RTCIceParameters;
    iceCandidates: RTCIceCandidate[];
    iceCandidatesComplete: boolean;
    iceOptions?: string;
    simulcastParameters: RTCRtpSimulcastParameters[];
    constructor(kind: Kind, port: number, profile: string, fmt: string[] | number[]);
    toString(): string;
}
export declare class GroupDescription {
    semantic: string;
    items: string[];
    constructor(semantic: string, items: string[]);
    str(): string;
}
export declare function candidateToSdp(c: RTCIceCandidate): string;
export declare function candidateFromSdp(sdp: string): RTCIceCandidate;
export declare class RTCSessionDescription {
    sdp: string;
    type: "offer" | "answer";
    constructor(sdp: string, type: "offer" | "answer");
}
export declare function addSDPHeader(type: "offer" | "answer", description: SessionDescription): void;
export declare class SsrcDescription {
    ssrc: number;
    cname?: string;
    msid?: string;
    msLabel?: string;
    label?: string;
    constructor(props: Partial<SsrcDescription>);
}
