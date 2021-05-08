/// <reference types="node" />
import Event from "rx.mini";
import { RtcpPacket, RtpPacket } from "../../../rtp/src";
import { RTCDtlsTransport } from "../transport/dtls";
import { Kind } from "../types/domain";
import { RTCRtpCodecParameters, RTCRtpParameters } from "./parameters";
import { SenderBandwidthEstimator } from "./senderBWE/senderBWE";
import { MediaStreamTrack } from "./track";
export declare class RTCRtpSender {
    trackOrKind: Kind | MediaStreamTrack;
    dtlsTransport: RTCDtlsTransport;
    readonly type = "sender";
    readonly kind: Kind;
    readonly ssrc: any;
    readonly streamId: string;
    readonly trackId: string;
    readonly onReady: Event<any[]>;
    readonly onRtcp: Event<[RtcpPacket]>;
    readonly senderBWE: SenderBandwidthEstimator;
    private cname?;
    private disposeTrack?;
    private lsr?;
    private lsrTime?;
    private ntpTimestamp;
    private rtpTimestamp;
    private octetCount;
    private packetCount;
    private rtt?;
    private sequenceNumber?;
    private timestamp?;
    private timestampOffset;
    private seqOffset;
    private rtpCache;
    private _codec?;
    set codec(codec: RTCRtpCodecParameters);
    parameters?: RTCRtpParameters;
    track?: MediaStreamTrack;
    constructor(trackOrKind: Kind | MediaStreamTrack, dtlsTransport: RTCDtlsTransport);
    registerTrack(track: MediaStreamTrack): void;
    replaceTrack(track: MediaStreamTrack | null): Promise<void>;
    get ready(): boolean;
    stop(): void;
    rtcpRunner: boolean;
    runRtcp(): Promise<void>;
    private replaceRTP;
    sendRtp(rtp: Buffer | RtpPacket): void;
    handleRtcpPacket(rtcpPacket: RtcpPacket): void;
}
