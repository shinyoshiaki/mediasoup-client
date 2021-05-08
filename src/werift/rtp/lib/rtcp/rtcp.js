"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtcpPacketConverter = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const header_1 = require("./header");
const psfb_1 = require("./psfb");
const rr_1 = require("./rr");
const rtpfb_1 = require("./rtpfb");
const sdes_1 = require("./sdes");
const sr_1 = require("./sr");
const log = debug_1.default("werift/rtp/rtcp/rtcp");
class RtcpPacketConverter {
    static serialize(type, count, payload, length) {
        const header = new header_1.RtcpHeader({
            type,
            count,
            version: 2,
            length,
        });
        const buf = header.serialize();
        return Buffer.concat([buf, payload]);
    }
    static deSerialize(data) {
        let pos = 0;
        const packets = [];
        while (pos < data.length) {
            const header = header_1.RtcpHeader.deSerialize(data.slice(pos, pos + header_1.HEADER_SIZE));
            pos += header_1.HEADER_SIZE;
            let payload = data.slice(pos);
            pos += header.length * 4;
            if (header.padding) {
                payload = payload.slice(0, payload.length - payload.slice(-1)[0]);
            }
            switch (header.type) {
                case sr_1.RtcpSrPacket.type:
                    packets.push(sr_1.RtcpSrPacket.deSerialize(payload, header.count));
                    break;
                case rr_1.RtcpRrPacket.type:
                    packets.push(rr_1.RtcpRrPacket.deSerialize(payload, header.count));
                    break;
                case sdes_1.RtcpSourceDescriptionPacket.type:
                    packets.push(sdes_1.RtcpSourceDescriptionPacket.deSerialize(payload, header));
                    break;
                case rtpfb_1.RtcpTransportLayerFeedback.type:
                    packets.push(rtpfb_1.RtcpTransportLayerFeedback.deSerialize(payload, header));
                    break;
                case psfb_1.RtcpPayloadSpecificFeedback.type:
                    packets.push(psfb_1.RtcpPayloadSpecificFeedback.deSerialize(payload, header));
                    break;
                default:
                    log("unknown rtcp packet", header.type);
                    break;
            }
        }
        return packets;
    }
}
exports.RtcpPacketConverter = RtcpPacketConverter;
//# sourceMappingURL=rtcp.js.map