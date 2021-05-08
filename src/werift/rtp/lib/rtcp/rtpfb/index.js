"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtcpTransportLayerFeedback = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const nack_1 = require("./nack");
const twcc_1 = require("./twcc");
const log = debug_1.default("werift/rtp/rtcp/rtpfb/index");
class RtcpTransportLayerFeedback {
    constructor(props = {}) {
        this.type = RtcpTransportLayerFeedback.type;
        Object.assign(this, props);
    }
    serialize() {
        const payload = this.feedback.serialize();
        return payload;
    }
    static deSerialize(data, header) {
        let feedback;
        switch (header.count) {
            case nack_1.GenericNack.count:
                feedback = nack_1.GenericNack.deSerialize(data, header);
                break;
            case twcc_1.TransportWideCC.count:
                feedback = twcc_1.TransportWideCC.deSerialize(data, header);
                break;
            default:
                log("unknown rtpfb packet", header.count);
                break;
        }
        return new RtcpTransportLayerFeedback({ feedback, header });
    }
}
exports.RtcpTransportLayerFeedback = RtcpTransportLayerFeedback;
RtcpTransportLayerFeedback.type = 205;
//# sourceMappingURL=index.js.map