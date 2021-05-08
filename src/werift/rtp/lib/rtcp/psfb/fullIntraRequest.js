"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullIntraRequest = void 0;
const helper_1 = require("../../helper");
class FullIntraRequest {
    constructor(props = {}) {
        this.count = FullIntraRequest.count;
        this.fir = [];
        Object.assign(this, props);
    }
    get length() {
        return Math.floor(this.serialize().length / 4 - 1);
    }
    static deSerialize(data) {
        const [senderSsrc, mediaSsrc] = helper_1.bufferReader(data, [4, 4]);
        const fir = [];
        for (let i = 8; i < data.length; i += 8) {
            fir.push({ ssrc: data.readUInt32BE(i), sequenceNumber: data[i + 4] });
        }
        return new FullIntraRequest({ senderSsrc, mediaSsrc, fir });
    }
    serialize() {
        const ssrcs = helper_1.bufferWriter([4, 4], [this.senderSsrc, this.mediaSsrc]);
        const fir = Buffer.alloc(this.fir.length * 8);
        this.fir.forEach(({ ssrc, sequenceNumber }, i) => {
            fir.writeUInt32BE(ssrc, i * 8);
            fir[i * 8 + 4] = sequenceNumber;
        });
        return Buffer.concat([ssrcs, fir]);
    }
}
exports.FullIntraRequest = FullIntraRequest;
FullIntraRequest.count = 4;
//# sourceMappingURL=fullIntraRequest.js.map