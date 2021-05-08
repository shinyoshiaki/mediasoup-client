"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenderBandwidthEstimator = void 0;
const tslib_1 = require("tslib");
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
const helper_1 = require("../../../../rtp/src/helper");
const utils_1 = require("../../utils");
const cumulativeResult_1 = require("./cumulativeResult");
const COUNTER_MAX = 20;
const SCORE_MAX = 10;
class SenderBandwidthEstimator {
    constructor() {
        this.congestion = false;
        this.onAvailableBitrate = new rx_mini_1.default();
        this.onCongestion = new rx_mini_1.default();
        this.onCongestionScore = new rx_mini_1.default();
        this.congestionCounter = 0;
        this.cumulativeResult = new cumulativeResult_1.CumulativeResult();
        this.sentInfos = {};
        this._congestionScore = 1;
        this._availableBitrate = 0;
    }
    /**1~10 big is worth*/
    get congestionScore() {
        return this._congestionScore;
    }
    set congestionScore(v) {
        this._congestionScore = v;
        this.onCongestionScore.execute(v);
    }
    get availableBitrate() {
        return this._availableBitrate;
    }
    set availableBitrate(v) {
        this._availableBitrate = v;
        this.onAvailableBitrate.execute(v);
    }
    receiveTWCC(feedback) {
        const nowMs = utils_1.milliTime();
        const elapsedMs = nowMs - this.cumulativeResult.firstPacketSentAtMs;
        if (elapsedMs > 1000) {
            this.cumulativeResult.reset();
            // Congestion may be occurring.
            if (this.congestionCounter < COUNTER_MAX) {
                this.congestionCounter++;
            }
            else if (this.congestionScore < SCORE_MAX) {
                this.congestionScore++;
            }
            if (this.congestionCounter >= COUNTER_MAX && !this.congestion) {
                this.congestion = true;
                this.onCongestion.execute(this.congestion);
            }
        }
        for (const result of feedback.packetResults) {
            if (!result.received)
                continue;
            const wideSeq = result.sequenceNumber;
            const info = this.sentInfos[wideSeq];
            if (!info)
                continue;
            if (!result.receivedAtMs)
                continue;
            this.cumulativeResult.addPacket(info.size, info.sendingAtMs, result.receivedAtMs);
        }
        if (elapsedMs >= 100 && this.cumulativeResult.numPackets >= 20) {
            this.availableBitrate = Math.min(this.cumulativeResult.sendBitrate, this.cumulativeResult.receiveBitrate);
            this.cumulativeResult.reset();
            if (this.congestionCounter > -COUNTER_MAX) {
                const maxBonus = helper_1.Int(COUNTER_MAX / 2) + 1;
                const minBonus = helper_1.Int(COUNTER_MAX / 4) + 1;
                const bonus = maxBonus - ((maxBonus - minBonus) / 10) * this.congestionScore;
                this.congestionCounter = this.congestionCounter - bonus;
            }
            if (this.congestionCounter <= -COUNTER_MAX) {
                if (this.congestionScore > 1) {
                    this.congestionScore--;
                    this.onCongestion.execute(false);
                }
                this.congestionCounter = 0;
            }
            if (this.congestionCounter <= 0 && this.congestion) {
                this.congestion = false;
                this.onCongestion.execute(this.congestion);
            }
        }
    }
    rtpPacketSent(sentInfo) {
        Object.keys(sentInfo)
            .map((v) => Number(v))
            .sort()
            .filter((seq) => seq < sentInfo.wideSeq)
            .forEach((seq) => {
            delete this.sentInfos[seq];
        });
        this.sentInfos[sentInfo.wideSeq] = sentInfo;
    }
}
exports.SenderBandwidthEstimator = SenderBandwidthEstimator;
//# sourceMappingURL=senderBWE.js.map