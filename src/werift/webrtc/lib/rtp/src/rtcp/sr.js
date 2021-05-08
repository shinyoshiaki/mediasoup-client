"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtcpSenderInfo = exports.RtcpSrPacket = void 0;
const lodash_1 = require("lodash");
const helper_1 = require("../helper");
const rr_1 = require("./rr");
const rtcp_1 = require("./rtcp");
class RtcpSrPacket {
    constructor(props = {}) {
        this.ssrc = 0;
        this.reports = [];
        this.type = RtcpSrPacket.type;
        Object.assign(this, props);
    }
    serialize() {
        let payload = Buffer.alloc(4);
        payload.writeUInt32BE(this.ssrc);
        payload = Buffer.concat([payload, this.senderInfo.serialize()]);
        payload = Buffer.concat([
            payload,
            ...this.reports.map((report) => report.serialize()),
        ]);
        return rtcp_1.RtcpPacketConverter.serialize(RtcpSrPacket.type, this.reports.length, payload, Math.floor(payload.length / 4));
    }
    static deSerialize(payload, count) {
        const ssrc = payload.readUInt32BE();
        const senderInfo = RtcpSenderInfo.deSerialize(payload.slice(4, 24));
        let pos = 24;
        const reports = [];
        for (const _ of lodash_1.range(count)) {
            reports.push(rr_1.RtcpReceiverInfo.deSerialize(payload.slice(pos, pos + 24)));
            pos += 24;
        }
        return new RtcpSrPacket({ ssrc, senderInfo, reports });
    }
}
exports.RtcpSrPacket = RtcpSrPacket;
RtcpSrPacket.type = 200;
class RtcpSenderInfo {
    constructor(props = {}) {
        Object.assign(this, props);
    }
    serialize() {
        return helper_1.bufferWriter([8, 4, 4, 4], [this.ntpTimestamp, this.rtpTimestamp, this.packetCount, this.octetCount]);
    }
    static deSerialize(data) {
        const [ntpTimestamp, rtpTimestamp, packetCount, octetCount,] = helper_1.bufferReader(data, [8, 4, 4, 4]);
        return new RtcpSenderInfo({
            ntpTimestamp,
            rtpTimestamp,
            packetCount,
            octetCount,
        });
    }
}
exports.RtcpSenderInfo = RtcpSenderInfo;
//# sourceMappingURL=sr.js.map