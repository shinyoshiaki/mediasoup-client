"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiverEstimatedMaxBitrate = void 0;
const helper_1 = require("../../helper");
const utils_1 = require("../../utils");
class ReceiverEstimatedMaxBitrate {
    constructor(props = {}) {
        this.count = ReceiverEstimatedMaxBitrate.count;
        this.uniqueID = "REMB";
        this.ssrcNum = 0;
        this.ssrcFeedbacks = [];
        Object.assign(this, props);
    }
    static deSerialize(data) {
        const [senderSsrc, mediaSsrc, uniqueID, ssrcNum, e_m] = helper_1.bufferReader(data, [
            4,
            4,
            4,
            1,
            1,
        ]);
        const brExp = utils_1.getBit(e_m, 0, 6);
        const brMantissa = (utils_1.getBit(e_m, 6, 2) << 16) + (data[14] << 8) + data[15];
        const bitrate = brExp > 46 ? 18446744073709551615n : BigInt(brMantissa) << BigInt(brExp);
        const ssrcFeedbacks = [];
        for (let i = 16; i < data.length; i += 4) {
            const feedback = data.slice(i).readUIntBE(0, 4);
            ssrcFeedbacks.push(feedback);
        }
        return new ReceiverEstimatedMaxBitrate({
            senderSsrc,
            mediaSsrc,
            uniqueID: helper_1.bufferWriter([4], [uniqueID]).toString(),
            ssrcNum,
            brExp,
            brMantissa,
            ssrcFeedbacks,
            bitrate,
        });
    }
    serialize() {
        const constant = Buffer.concat([
            helper_1.bufferWriter([4, 4], [this.senderSsrc, this.mediaSsrc]),
            Buffer.from(this.uniqueID),
            helper_1.bufferWriter([1], [this.ssrcNum]),
        ]);
        const writer = new utils_1.BitWriter(24);
        writer.set(6, 0, this.brExp).set(18, 6, this.brMantissa);
        const feedbacks = Buffer.concat(this.ssrcFeedbacks.map((feedback) => helper_1.bufferWriter([4], [feedback])));
        const buf = Buffer.concat([
            constant,
            helper_1.bufferWriter([3], [writer.value]),
            feedbacks,
        ]);
        this.length = buf.length / 4;
        return buf;
    }
}
exports.ReceiverEstimatedMaxBitrate = ReceiverEstimatedMaxBitrate;
ReceiverEstimatedMaxBitrate.count = 15;
//# sourceMappingURL=remb.js.map