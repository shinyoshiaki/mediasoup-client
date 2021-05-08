"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CumulativeResult = void 0;
const helper_1 = require("../../../../rtp/src/helper");
// refer by mediasoup
class CumulativeResult {
    constructor() {
        this.numPackets = 0;
        /**byte */
        this.totalSize = 0;
        this.firstPacketSentAtMs = 0;
        this.lastPacketSentAtMs = 0;
        this.firstPacketReceivedAtMs = 0;
        this.lastPacketReceivedAtMs = 0;
    }
    /**
     *
     * @param size byte
     * @param sentAtMs
     * @param receivedAtMs
     */
    addPacket(size, sentAtMs, receivedAtMs) {
        if (this.numPackets === 0) {
            this.firstPacketSentAtMs = sentAtMs;
            this.firstPacketReceivedAtMs = receivedAtMs;
            this.lastPacketSentAtMs = sentAtMs;
            this.lastPacketReceivedAtMs = receivedAtMs;
        }
        else {
            if (sentAtMs < this.firstPacketSentAtMs)
                this.firstPacketSentAtMs = sentAtMs;
            if (receivedAtMs < this.firstPacketReceivedAtMs)
                this.firstPacketReceivedAtMs = receivedAtMs;
            if (sentAtMs > this.lastPacketSentAtMs)
                this.lastPacketSentAtMs = sentAtMs;
            if (receivedAtMs > this.lastPacketReceivedAtMs)
                this.lastPacketReceivedAtMs = receivedAtMs;
        }
        this.numPackets++;
        this.totalSize += size;
    }
    reset() {
        this.numPackets = 0;
        this.totalSize = 0;
        this.firstPacketSentAtMs = 0;
        this.lastPacketSentAtMs = 0;
        this.firstPacketReceivedAtMs = 0;
        this.lastPacketReceivedAtMs = 0;
    }
    get receiveBitrate() {
        const recvIntervalMs = this.lastPacketReceivedAtMs - this.firstPacketReceivedAtMs;
        const bitrate = (this.totalSize / recvIntervalMs) * 8 * 1000;
        return helper_1.Int(bitrate);
    }
    get sendBitrate() {
        const sendIntervalMs = this.lastPacketSentAtMs - this.firstPacketSentAtMs;
        const bitrate = (this.totalSize / sendIntervalMs) * 8 * 1000;
        return helper_1.Int(bitrate);
    }
}
exports.CumulativeResult = CumulativeResult;
//# sourceMappingURL=cumulativeResult.js.map