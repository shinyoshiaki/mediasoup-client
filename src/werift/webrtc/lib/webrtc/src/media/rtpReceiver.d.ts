import { RtcpPacket, RtpPacket } from "../../../rtp/src";
import { RTCDtlsTransport } from "../transport/dtls";
import { Kind } from "../types/domain";
import { Nack } from "./nack";
import { RTCRtpCodecParameters } from "./parameters";
import { ReceiverTWCC } from "./receiver/receiverTwcc";
import { Extensions } from "./router";
import { MediaStreamTrack } from "./track";
export declare class RTCRtpReceiver {
    kind: Kind;
    dtlsTransport: RTCDtlsTransport;
    rtcpSsrc: number;
    readonly type = "receiver";
    readonly uuid: string;
    readonly tracks: MediaStreamTrack[];
    readonly trackBySSRC: {
        [ssrc: string]: MediaStreamTrack;
    };
    readonly trackByRID: {
        [rid: string]: MediaStreamTrack;
    };
    readonly nack: Nack;
    readonly lsr: {
        [key: number]: BigInt;
    };
    readonly lsrTime: {
        [key: number]: number;
    };
    sdesMid?: string;
    rid?: string;
    receiverTWCC?: ReceiverTWCC;
    supportTWCC: boolean;
    codecs: RTCRtpCodecParameters[];
    constructor(kind: Kind, dtlsTransport: RTCDtlsTransport, rtcpSsrc: number);
    /**
     * setup TWCC if supported
     * @param mediaSourceSsrc
     */
    setupTWCC(mediaSourceSsrc?: number): void;
    addTrack(track: MediaStreamTrack): boolean;
    stop(): void;
    rtcpRunning: boolean;
    runRtcp(): Promise<void>;
    sendRtcpPLI(mediaSsrc: number): Promise<void>;
    handleRtcpPacket(packet: RtcpPacket): void;
    handleRtpBySsrc: (packet: RtpPacket, extensions: Extensions) => void;
    handleRtpByRid: (packet: RtpPacket, rid: string, extensions: Extensions) => void;
    private handleRTP;
}
