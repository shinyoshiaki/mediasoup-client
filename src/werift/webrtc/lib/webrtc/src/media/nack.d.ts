import { RtpPacket } from "../../../rtp/src";
import { RTCRtpReceiver } from "./rtpReceiver";
export declare class Nack {
    private receiver;
    private newEstSeqNum;
    private _lost;
    mediaSourceSsrc?: number;
    constructor(receiver: RTCRtpReceiver);
    get lost(): number[];
    onPacket(packet: RtpPacket): void;
    private increment;
    private packetLost;
}
