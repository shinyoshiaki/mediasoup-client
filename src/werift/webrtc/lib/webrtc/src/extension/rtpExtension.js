"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAbsSendTime = exports.useTransportWideCC = exports.useSdesRTPStreamID = exports.useSdesMid = exports.RTP_EXTENSION_URI = void 0;
const parameters_1 = require("../media/parameters");
exports.RTP_EXTENSION_URI = {
    sdesMid: "urn:ietf:params:rtp-hdrext:sdes:mid",
    sdesRTPStreamID: "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
    transportWideCC: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
    absSendTime: "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
};
function useSdesMid() {
    return new parameters_1.RTCRtpHeaderExtensionParameters({
        uri: exports.RTP_EXTENSION_URI.sdesMid,
    });
}
exports.useSdesMid = useSdesMid;
function useSdesRTPStreamID() {
    return new parameters_1.RTCRtpHeaderExtensionParameters({
        uri: exports.RTP_EXTENSION_URI.sdesRTPStreamID,
    });
}
exports.useSdesRTPStreamID = useSdesRTPStreamID;
function useTransportWideCC() {
    return new parameters_1.RTCRtpHeaderExtensionParameters({
        uri: exports.RTP_EXTENSION_URI.transportWideCC,
    });
}
exports.useTransportWideCC = useTransportWideCC;
function useAbsSendTime() {
    return new parameters_1.RTCRtpHeaderExtensionParameters({
        uri: exports.RTP_EXTENSION_URI.absSendTime,
    });
}
exports.useAbsSendTime = useAbsSendTime;
//# sourceMappingURL=rtpExtension.js.map