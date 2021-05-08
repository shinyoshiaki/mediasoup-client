"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nack = void 0;
const lodash_1 = require("lodash");
const src_1 = require("../../../rtp/src");
const utils_1 = require("../utils");
const LOST_SIZE = 30 * 5;
class Nack {
    constructor(receiver) {
        this.receiver = receiver;
        this.newEstSeqNum = 0;
        this._lost = {};
        setInterval(() => this.packetLost(), 20);
    }
    get lost() {
        return Object.keys(this._lost).map(Number);
    }
    onPacket(packet) {
        const { sequenceNumber, ssrc } = packet.header;
        this.mediaSourceSsrc = ssrc;
        if (this.newEstSeqNum === 0) {
            this.newEstSeqNum = sequenceNumber;
            return;
        }
        if (this._lost[sequenceNumber]) {
            delete this._lost[sequenceNumber];
            return;
        }
        if (sequenceNumber === utils_1.uint16Add(this.newEstSeqNum, 1)) {
            this.newEstSeqNum = sequenceNumber;
        }
        else if (sequenceNumber > utils_1.uint16Add(this.newEstSeqNum, 1)) {
            // packet lost detected
            lodash_1.range(utils_1.uint16Add(this.newEstSeqNum, 1), sequenceNumber).forEach((seq) => {
                this._lost[seq] = 1;
            });
            this.receiver.sendRtcpPLI(this.mediaSourceSsrc);
            this.newEstSeqNum = sequenceNumber;
            if (Object.keys(this._lost).length > LOST_SIZE) {
                this._lost = Object.entries(this._lost)
                    .slice(-LOST_SIZE)
                    .reduce((acc, [key, v]) => {
                    acc[key] = v;
                    return acc;
                }, {});
            }
        }
    }
    increment() {
        Object.keys(this._lost).forEach((seq) => {
            if (++this._lost[seq] > 10) {
                delete this._lost[seq];
            }
        });
    }
    packetLost() {
        if (this.lost.length > 0 && this.mediaSourceSsrc) {
            const rtcp = new src_1.RtcpTransportLayerFeedback({
                feedback: new src_1.GenericNack({
                    senderSsrc: this.receiver.rtcpSsrc,
                    mediaSourceSsrc: this.mediaSourceSsrc,
                    lost: this.lost,
                }),
            });
            this.receiver.dtlsTransport.sendRtcp([rtcp]);
            this.increment();
        }
    }
}
exports.Nack = Nack;
//# sourceMappingURL=nack.js.map