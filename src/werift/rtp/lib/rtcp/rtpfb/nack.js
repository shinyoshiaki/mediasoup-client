"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericNack = void 0;
const lodash_1 = require("lodash");
const helper_1 = require("../../helper");
const header_1 = require("../header");
class GenericNack {
    constructor(props = {}) {
        this.count = GenericNack.count;
        this.lost = [];
        Object.assign(this, props);
        if (!this.header) {
            this.header = new header_1.RtcpHeader({
                type: 205,
                count: this.count,
                version: 2,
            });
        }
    }
    static deSerialize(data, header) {
        const [senderSsrc, mediaSourceSsrc] = helper_1.bufferReader(data, [4, 4]);
        const lost = lodash_1.range(8, data.length, 4)
            .map((pos) => {
            const lost = [];
            const [pid, blp] = helper_1.bufferReader(data.slice(pos), [2, 2]);
            lost.push(pid);
            lodash_1.range(0, 16).forEach((d) => {
                if ((blp >> d) & 1) {
                    lost.push(pid + d + 1);
                }
            });
            return lost;
        })
            .flatMap((v) => v);
        return new GenericNack({
            header,
            senderSsrc,
            mediaSourceSsrc,
            lost,
        });
    }
    serialize() {
        const ssrcs = helper_1.bufferWriter([4, 4], [this.senderSsrc, this.mediaSourceSsrc]);
        const fics = [];
        if (this.lost.length > 0) {
            let pid = this.lost[0], blp = 0;
            this.lost.slice(1).forEach((p) => {
                const d = p - pid - 1;
                if (d < 16) {
                    blp |= 1 << d;
                }
                else {
                    fics.push(helper_1.bufferWriter([2, 2], [pid, blp]));
                    pid = p;
                    blp = 0;
                }
            });
            fics.push(helper_1.bufferWriter([2, 2], [pid, blp]));
        }
        const buf = Buffer.concat([ssrcs, Buffer.concat(fics)]);
        this.header.length = buf.length / 4;
        return Buffer.concat([this.header.serialize(), buf]);
    }
}
exports.GenericNack = GenericNack;
GenericNack.count = 1;
//# sourceMappingURL=nack.js.map