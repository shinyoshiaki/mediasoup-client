"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtpRouter = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const src_1 = require("../../../rtp/src");
const helper_1 = require("../../../rtp/src/helper");
const rtpExtension_1 = require("../extension/rtpExtension");
const track_1 = require("./track");
const log = debug_1.default("werift/webrtc/media/router");
class RtpRouter {
    constructor() {
        this.ssrcTable = {};
        this.ridTable = {};
        this.extIdUriMap = {};
        this.routeRtp = (packet) => {
            const extensions = RtpRouter.rtpHeaderExtensionsParser(packet.header.extensions, this.extIdUriMap);
            let ssrcReceiver = this.ssrcTable[packet.header.ssrc];
            const rid = extensions[rtpExtension_1.RTP_EXTENSION_URI.sdesRTPStreamID];
            if (rid) {
                ssrcReceiver = this.ridTable[rid];
                ssrcReceiver.handleRtpByRid(packet, rid, extensions);
            }
            else {
                if (!ssrcReceiver)
                    return; // simulcast + absSendTime
                ssrcReceiver.handleRtpBySsrc(packet, extensions);
            }
            ssrcReceiver.sdesMid = extensions[rtpExtension_1.RTP_EXTENSION_URI.sdesMid];
        };
        this.routeRtcp = (packet) => {
            const recipients = [];
            switch (packet.type) {
                case src_1.RtcpSrPacket.type:
                    {
                        packet = packet;
                        recipients.push(this.ssrcTable[packet.ssrc]);
                    }
                    break;
                case src_1.RtcpRrPacket.type:
                    {
                        packet = packet;
                        packet.reports.forEach((report) => {
                            recipients.push(this.ssrcTable[report.ssrc]);
                        });
                    }
                    break;
                case src_1.RtcpSourceDescriptionPacket.type:
                    {
                        const sdes = packet;
                        // log("sdes", JSON.stringify(sdes.chunks));
                    }
                    break;
                case src_1.RtcpTransportLayerFeedback.type:
                    {
                        const rtpfb = packet;
                        if (rtpfb.feedback) {
                            recipients.push(this.ssrcTable[rtpfb.feedback.mediaSourceSsrc]);
                        }
                    }
                    break;
                case src_1.RtcpPayloadSpecificFeedback.type:
                    {
                        const psfb = packet;
                        switch (psfb.feedback.count) {
                            case src_1.ReceiverEstimatedMaxBitrate.count:
                                const remb = psfb.feedback;
                                recipients.push(this.ssrcTable[remb.ssrcFeedbacks[0]]);
                                break;
                            default:
                                recipients.push(this.ssrcTable[psfb.feedback.senderSsrc]);
                        }
                    }
                    break;
            }
            recipients
                .filter((v) => v) // todo simulcast
                .forEach((recipient) => recipient.handleRtcpPacket(packet));
        };
    }
    registerRtpSender(sender) {
        this.ssrcTable[sender.ssrc] = sender;
    }
    registerRtpReceiverBySsrc(transceiver, params) {
        log("registerRtpReceiverBySsrc", params);
        const ssrcs = params.encodings
            .map((encode) => encode.ssrc)
            .filter((v) => v);
        ssrcs.forEach((ssrc) => {
            this.ssrcTable[ssrc] = transceiver.receiver;
            transceiver.addTrack(new track_1.MediaStreamTrack({
                ssrc,
                kind: transceiver.kind,
                id: transceiver.sender.streamId,
                remote: true,
            }));
        });
        params.headerExtensions.forEach((extension) => {
            this.extIdUriMap[extension.id] = extension.uri;
        });
    }
    registerRtpReceiverByRid(transceiver, param) {
        log("registerRtpReceiverByRid", param);
        transceiver.addTrack(new track_1.MediaStreamTrack({
            rid: param.rid,
            kind: transceiver.kind,
            id: transceiver.sender.streamId,
            remote: true,
        }));
        this.ridTable[param.rid] = transceiver.receiver;
    }
    static rtpHeaderExtensionsParser(extensions, extIdUriMap) {
        return extensions
            .map((extension) => {
            const uri = extIdUriMap[extension.id];
            switch (uri) {
                case rtpExtension_1.RTP_EXTENSION_URI.sdesMid:
                case rtpExtension_1.RTP_EXTENSION_URI.sdesRTPStreamID:
                    return { uri, value: extension.payload.toString() };
                case rtpExtension_1.RTP_EXTENSION_URI.transportWideCC:
                    return { uri, value: extension.payload.readUInt16BE() };
                case rtpExtension_1.RTP_EXTENSION_URI.absSendTime:
                    return {
                        uri,
                        value: helper_1.bufferReader(extension.payload, [3])[0],
                    };
            }
        })
            .reduce((acc, cur) => {
            if (cur)
                acc[cur.uri] = cur.value;
            return acc;
        }, {});
    }
}
exports.RtpRouter = RtpRouter;
//# sourceMappingURL=router.js.map