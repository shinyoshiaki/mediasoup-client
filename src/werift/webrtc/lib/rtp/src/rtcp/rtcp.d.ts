/// <reference types="node" />
import { RtcpPayloadSpecificFeedback } from "./psfb";
import { RtcpRrPacket } from "./rr";
import { RtcpTransportLayerFeedback } from "./rtpfb";
import { RtcpSourceDescriptionPacket } from "./sdes";
import { RtcpSrPacket } from "./sr";
export declare type RtcpPacket = RtcpRrPacket | RtcpSrPacket | RtcpPayloadSpecificFeedback | RtcpSourceDescriptionPacket | RtcpTransportLayerFeedback;
export declare class RtcpPacketConverter {
    static serialize(type: number, count: number, payload: Buffer, length: number): Buffer;
    static deSerialize(data: Buffer): RtcpPacket[];
}
