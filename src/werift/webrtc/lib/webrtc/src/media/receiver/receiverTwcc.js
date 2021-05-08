"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiverTWCC = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const src_1 = require("../../../../rtp/src");
const helper_1 = require("../../../../sctp/src/helper");
const utils_1 = require("../../utils");
const log = debug_1.default("werift/webrtc/media/receiver/receiverTwcc");
class ReceiverTWCC {
    constructor(dtlsTransport, rtcpSsrc, mediaSourceSsrc) {
        this.dtlsTransport = dtlsTransport;
        this.rtcpSsrc = rtcpSsrc;
        this.mediaSourceSsrc = mediaSourceSsrc;
        this.extensionInfo = {};
        this.twccRunning = false;
        /** uint8 */
        this.fbPktCount = 0;
        this.runTWCC();
    }
    handleTWCC(transportSequenceNumber) {
        this.extensionInfo[transportSequenceNumber] = {
            tsn: transportSequenceNumber,
            timestamp: utils_1.microTime(),
        };
        if (Object.keys(this.extensionInfo).length > 10) {
            this.sendTWCC();
        }
    }
    async runTWCC() {
        while (this.twccRunning) {
            this.sendTWCC();
            await helper_1.sleep(100);
        }
    }
    sendTWCC() {
        if (Object.keys(this.extensionInfo).length === 0)
            return;
        const extensionsArr = Object.values(this.extensionInfo).sort((a, b) => a.tsn - b.tsn);
        const minTSN = extensionsArr[0].tsn;
        const maxTSN = extensionsArr.slice(-1)[0].tsn;
        const packetChunks = [];
        const baseSequenceNumber = extensionsArr[0].tsn;
        const packetStatusCount = utils_1.uint16Add(maxTSN - minTSN, 1);
        /**micro sec */
        let referenceTime;
        let lastPacketStatus;
        const recvDeltas = [];
        for (let i = minTSN; i <= maxTSN; i++) {
            /**micro sec */
            const timestamp = this.extensionInfo[i]?.timestamp;
            if (timestamp) {
                if (!this.lastTimestamp) {
                    this.lastTimestamp = timestamp;
                }
                if (!referenceTime) {
                    referenceTime = this.lastTimestamp;
                }
                const delta = timestamp - this.lastTimestamp;
                this.lastTimestamp = timestamp;
                const recvDelta = new src_1.RecvDelta({
                    delta: Number(delta),
                });
                recvDelta.parseDelta();
                recvDeltas.push(recvDelta);
                // when status changed
                if (lastPacketStatus != undefined &&
                    lastPacketStatus.status !== recvDelta.type) {
                    packetChunks.push(new src_1.RunLengthChunk({
                        packetStatus: lastPacketStatus.status,
                        runLength: i - lastPacketStatus.minTSN,
                    }));
                    lastPacketStatus = { minTSN: i, status: recvDelta.type };
                }
                // last status
                if (i === maxTSN) {
                    if (lastPacketStatus != undefined) {
                        packetChunks.push(new src_1.RunLengthChunk({
                            packetStatus: lastPacketStatus.status,
                            runLength: i - lastPacketStatus.minTSN + 1,
                        }));
                    }
                    else {
                        packetChunks.push(new src_1.RunLengthChunk({
                            packetStatus: recvDelta.type,
                            runLength: 1,
                        }));
                    }
                }
                if (lastPacketStatus == undefined) {
                    lastPacketStatus = { minTSN: i, status: recvDelta.type };
                }
            }
        }
        if (!referenceTime) {
            return;
        }
        const packet = new src_1.RtcpTransportLayerFeedback({
            feedback: new src_1.TransportWideCC({
                senderSsrc: this.rtcpSsrc,
                mediaSourceSsrc: this.mediaSourceSsrc,
                baseSequenceNumber,
                packetStatusCount,
                referenceTime: utils_1.uint24(Math.floor(referenceTime / 1000 / 64)),
                fbPktCount: this.fbPktCount,
                recvDeltas,
                packetChunks,
            }),
        });
        this.dtlsTransport.sendRtcp([packet]).catch((err) => {
            log(err);
        });
        this.extensionInfo = {};
        this.fbPktCount = utils_1.uint8Add(this.fbPktCount, 1);
    }
}
exports.ReceiverTWCC = ReceiverTWCC;
//# sourceMappingURL=receiverTwcc.js.map