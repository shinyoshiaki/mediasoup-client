import { Extension, RtcpPacket, RtpPacket } from "../../../rtp/src";
import { RTCRtpReceiveParameters, RTCRtpSimulcastParameters } from "./parameters";
import { RTCRtpSender } from "./rtpSender";
import { RTCRtpTransceiver } from "./rtpTransceiver";
export declare type Extensions = {
    [uri: string]: number | string;
};
export declare class RtpRouter {
    private ssrcTable;
    private ridTable;
    private extIdUriMap;
    constructor();
    registerRtpSender(sender: RTCRtpSender): void;
    registerRtpReceiverBySsrc(transceiver: RTCRtpTransceiver, params: RTCRtpReceiveParameters): void;
    registerRtpReceiverByRid(transceiver: RTCRtpTransceiver, param: RTCRtpSimulcastParameters): void;
    static rtpHeaderExtensionsParser(extensions: Extension[], extIdUriMap: {
        [id: number]: string;
    }): Extensions;
    routeRtp: (packet: RtpPacket) => void;
    routeRtcp: (packet: RtcpPacket) => void;
}
