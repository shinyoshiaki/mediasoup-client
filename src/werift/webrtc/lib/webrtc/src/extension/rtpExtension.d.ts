import { RTCRtpHeaderExtensionParameters } from "../media/parameters";
export declare const RTP_EXTENSION_URI: {
    readonly sdesMid: "urn:ietf:params:rtp-hdrext:sdes:mid";
    readonly sdesRTPStreamID: "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id";
    readonly transportWideCC: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01";
    readonly absSendTime: "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time";
};
export declare function useSdesMid(): RTCRtpHeaderExtensionParameters;
export declare function useSdesRTPStreamID(): RTCRtpHeaderExtensionParameters;
export declare function useTransportWideCC(): RTCRtpHeaderExtensionParameters;
export declare function useAbsSendTime(): RTCRtpHeaderExtensionParameters;
