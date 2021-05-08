"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTCRtpReceiver = void 0;
const uuid_1 = require("uuid");
const src_1 = require("../../../rtp/src");
const rtpExtension_1 = require("../extension/rtpExtension");
const helper_1 = require("../helper");
const nack_1 = require("./nack");
const receiverTwcc_1 = require("./receiver/receiverTwcc");
class RTCRtpReceiver {
    constructor(kind, dtlsTransport, rtcpSsrc) {
        this.kind = kind;
        this.dtlsTransport = dtlsTransport;
        this.rtcpSsrc = rtcpSsrc;
        this.type = "receiver";
        this.uuid = uuid_1.v4();
        this.tracks = [];
        this.trackBySSRC = {};
        this.trackByRID = {};
        this.nack = new nack_1.Nack(this);
        this.lsr = {};
        this.lsrTime = {};
        this.supportTWCC = false;
        this.codecs = [];
        this.rtcpRunning = false;
        this.handleRtpBySsrc = (packet, extensions) => {
            const track = this.trackBySSRC[packet.header.ssrc];
            if (!track)
                throw new Error();
            this.handleRTP(track, packet, extensions);
        };
        this.handleRtpByRid = (packet, rid, extensions) => {
            const track = this.trackByRID[rid];
            if (!track)
                throw new Error();
            this.handleRTP(track, packet, extensions);
        };
    }
    /**
     * setup TWCC if supported
     * @param mediaSourceSsrc
     */
    setupTWCC(mediaSourceSsrc) {
        this.supportTWCC = !!this.codecs.find((codec) => codec.rtcpFeedback.find((v) => v.type === "transport-cc"));
        if (this.supportTWCC && mediaSourceSsrc) {
            this.receiverTWCC = new receiverTwcc_1.ReceiverTWCC(this.dtlsTransport, this.rtcpSsrc, mediaSourceSsrc);
        }
    }
    addTrack(track) {
        const exist = this.tracks.find((t) => {
            if (t.rid)
                return t.rid === track.rid;
            if (t.ssrc)
                return t.ssrc === track.ssrc;
        });
        if (!exist) {
            this.tracks.push(track);
            if (track.ssrc)
                this.trackBySSRC[track.ssrc] = track;
            if (track.rid)
                this.trackByRID[track.rid] = track;
            return true;
        }
        return false;
    }
    stop() {
        this.rtcpRunning = false;
        if (this.receiverTWCC)
            this.receiverTWCC.twccRunning = false;
    }
    async runRtcp() {
        if (this.rtcpRunning)
            return;
        this.rtcpRunning = true;
        while (this.rtcpRunning) {
            await helper_1.sleep(500 + Math.random() * 1000);
            const reports = [];
            const packet = new src_1.RtcpRrPacket({ ssrc: this.rtcpSsrc, reports });
            try {
                await this.dtlsTransport.sendRtcp([packet]);
            }
            catch (error) {
                await helper_1.sleep(500 + Math.random() * 1000);
            }
        }
    }
    async sendRtcpPLI(mediaSsrc) {
        const packet = new src_1.RtcpPayloadSpecificFeedback({
            feedback: new src_1.PictureLossIndication({
                senderSsrc: this.rtcpSsrc,
                mediaSsrc,
            }),
        });
        try {
            await this.dtlsTransport.sendRtcp([packet]);
        }
        catch (error) { }
    }
    handleRtcpPacket(packet) {
        switch (packet.type) {
            case src_1.RtcpSrPacket.type:
                {
                    const sr = packet;
                    this.lsr[sr.ssrc] = (sr.senderInfo.ntpTimestamp >> 16n) & 0xffffffffn;
                    this.lsrTime[sr.ssrc] = Date.now() / 1000;
                }
                break;
        }
    }
    handleRTP(track, packet, extensions) {
        if (this.receiverTWCC) {
            const transportSequenceNumber = extensions[rtpExtension_1.RTP_EXTENSION_URI.transportWideCC];
            if (!transportSequenceNumber == undefined)
                throw new Error();
            this.receiverTWCC.handleTWCC(transportSequenceNumber);
        }
        else if (this.supportTWCC) {
            this.setupTWCC(packet.header.ssrc);
        }
        if (track.kind === "video")
            this.nack.onPacket(packet);
        track.onReceiveRtp.execute(packet);
        this.runRtcp();
    }
}
exports.RTCRtpReceiver = RTCRtpReceiver;
//# sourceMappingURL=rtpReceiver.js.map