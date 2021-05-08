"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtcpPayloadSpecificFeedback = void 0;
const tslib_1 = require("tslib");
const fullIntraRequest_1 = require("./fullIntraRequest");
const pictureLossIndication_1 = require("./pictureLossIndication");
const rtcp_1 = require("../rtcp");
const remb_1 = require("./remb");
const debug_1 = tslib_1.__importDefault(require("debug"));
const log = debug_1.default("werift/rtp/rtcp/psfb/index");
class RtcpPayloadSpecificFeedback {
    constructor(props = {}) {
        this.type = RtcpPayloadSpecificFeedback.type;
        Object.assign(this, props);
    }
    serialize() {
        const payload = this.feedback.serialize();
        return rtcp_1.RtcpPacketConverter.serialize(this.type, this.feedback.count, payload, this.feedback.length);
    }
    static deSerialize(data, header) {
        let feedback;
        switch (header.count) {
            case fullIntraRequest_1.FullIntraRequest.count:
                feedback = fullIntraRequest_1.FullIntraRequest.deSerialize(data);
                break;
            case pictureLossIndication_1.PictureLossIndication.count:
                feedback = pictureLossIndication_1.PictureLossIndication.deSerialize(data);
                break;
            case remb_1.ReceiverEstimatedMaxBitrate.count:
                feedback = remb_1.ReceiverEstimatedMaxBitrate.deSerialize(data);
                break;
            default:
                log("unknown psfb packet", header.count);
                break;
        }
        return new RtcpPayloadSpecificFeedback({ feedback });
    }
}
exports.RtcpPayloadSpecificFeedback = RtcpPayloadSpecificFeedback;
RtcpPayloadSpecificFeedback.type = 206;
//# sourceMappingURL=index.js.map