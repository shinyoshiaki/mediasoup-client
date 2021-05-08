"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtcpReceiverInfo = exports.RtcpRrPacket = void 0;
const lodash_1 = require("lodash");
const helper_1 = require("../helper");
const rtcp_1 = require("./rtcp");
class RtcpRrPacket {
    constructor(props = {}) {
        this.ssrc = 0;
        this.reports = [];
        this.type = RtcpRrPacket.type;
        Object.assign(this, props);
    }
    serialize() {
        let payload = helper_1.bufferWriter([4], [this.ssrc]);
        payload = Buffer.concat([
            payload,
            ...this.reports.map((report) => report.serialize()),
        ]);
        return rtcp_1.RtcpPacketConverter.serialize(RtcpRrPacket.type, this.reports.length, payload, Math.floor(payload.length / 4));
    }
    static deSerialize(data, count) {
        const [ssrc] = helper_1.bufferReader(data, [4]);
        let pos = 4;
        const reports = [];
        lodash_1.range(count).forEach(() => {
            reports.push(RtcpReceiverInfo.deSerialize(data.slice(pos, pos + 24)));
            pos += 24;
        });
        return new RtcpRrPacket({ ssrc, reports });
    }
}
exports.RtcpRrPacket = RtcpRrPacket;
RtcpRrPacket.type = 201;
class RtcpReceiverInfo {
    constructor(props = {}) {
        Object.assign(this, props);
    }
    serialize() {
        return helper_1.bufferWriter([4, 1, 3, 4, 4, 4, 4], [
            this.ssrc,
            this.fractionLost,
            this.packetsLost,
            this.highestSequence,
            this.jitter,
            this.lsr,
            this.dlsr,
        ]);
    }
    static deSerialize(data) {
        const [ssrc, fractionLost, packetsLost, highestSequence, jitter, lsr, dlsr,] = helper_1.bufferReader(data, [4, 1, 3, 4, 4, 4, 4]);
        return new RtcpReceiverInfo({
            ssrc,
            fractionLost,
            packetsLost,
            highestSequence,
            jitter,
            lsr,
            dlsr,
        });
    }
}
exports.RtcpReceiverInfo = RtcpReceiverInfo;
//# sourceMappingURL=rr.js.map