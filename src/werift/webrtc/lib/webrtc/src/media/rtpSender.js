"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTCRtpSender = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const debug_1 = tslib_1.__importDefault(require("debug"));
const jspack_1 = require("jspack");
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
const uuid = tslib_1.__importStar(require("uuid"));
const src_1 = require("../../../rtp/src");
const helper_1 = require("../../../rtp/src/helper");
const rtpExtension_1 = require("../extension/rtpExtension");
const helper_2 = require("../helper");
const utils_1 = require("../utils");
const senderBWE_1 = require("./senderBWE/senderBWE");
const track_1 = require("./track");
const log = debug_1.default("werift:webrtc:rtpSender");
const RTP_HISTORY_SIZE = 128;
const RTT_ALPHA = 0.85;
class RTCRtpSender {
    constructor(trackOrKind, dtlsTransport) {
        this.trackOrKind = trackOrKind;
        this.dtlsTransport = dtlsTransport;
        this.type = "sender";
        this.kind = typeof this.trackOrKind === "string"
            ? this.trackOrKind
            : this.trackOrKind.kind;
        this.ssrc = jspack_1.jspack.Unpack("!L", crypto_1.randomBytes(4))[0];
        this.streamId = uuid.v4();
        this.trackId = uuid.v4();
        this.onReady = new rx_mini_1.default();
        this.onRtcp = new rx_mini_1.default();
        this.senderBWE = new senderBWE_1.SenderBandwidthEstimator();
        this.ntpTimestamp = 0n;
        this.rtpTimestamp = 0;
        this.octetCount = 0;
        this.packetCount = 0;
        this.timestampOffset = 0;
        this.seqOffset = 0;
        this.rtpCache = [];
        this.rtcpRunner = false;
        dtlsTransport.onStateChange.subscribe((state) => {
            if (state === "connected") {
                this.onReady.execute();
            }
        });
        if (trackOrKind instanceof track_1.MediaStreamTrack) {
            this.registerTrack(trackOrKind);
        }
    }
    set codec(codec) {
        this._codec = codec;
        if (this.track)
            this.track.codec = codec;
    }
    registerTrack(track) {
        if (track.stopped)
            throw new Error("track is ended");
        if (this.disposeTrack) {
            this.disposeTrack();
        }
        const { unSubscribe } = track.onReceiveRtp.subscribe((rtp) => {
            this.sendRtp(rtp);
        });
        this.track = track;
        this.disposeTrack = unSubscribe;
        track.codec = this._codec;
    }
    async replaceTrack(track) {
        if (track === null) {
            // todo impl
            return;
        }
        if (track.stopped)
            throw new Error("track is ended");
        if (this.sequenceNumber != undefined) {
            const header = track.header || (await track.onReceiveRtp.asPromise())[0].header;
            this.replaceRTP(header);
        }
        this.registerTrack(track);
        log("replaceTrack", track.ssrc, track.rid);
    }
    get ready() {
        return this.dtlsTransport.state === "connected";
    }
    // todo test
    stop() {
        this.track = undefined;
        this.rtcpRunner = false;
    }
    async runRtcp() {
        if (this.rtcpRunner)
            return;
        this.rtcpRunner = true;
        while (this.rtcpRunner) {
            await helper_2.sleep(500 + Math.random() * 1000);
            const packets = [
                new src_1.RtcpSrPacket({
                    ssrc: this.ssrc,
                    senderInfo: new src_1.RtcpSenderInfo({
                        ntpTimestamp: this.ntpTimestamp,
                        rtpTimestamp: this.rtpTimestamp,
                        packetCount: this.packetCount,
                        octetCount: this.octetCount,
                    }),
                }),
            ];
            if (this.cname) {
                packets.push(new src_1.RtcpSourceDescriptionPacket({
                    chunks: [
                        new src_1.SourceDescriptionChunk({
                            source: this.ssrc,
                            items: [
                                new src_1.SourceDescriptionItem({ type: 1, text: this.cname }),
                            ],
                        }),
                    ],
                }));
            }
            this.lsr = (this.ntpTimestamp >> 16n) & 0xffffffffn;
            this.lsrTime = Date.now() / 1000;
            try {
                await this.dtlsTransport.sendRtcp(packets);
            }
            catch (error) {
                await helper_2.sleep(500 + Math.random() * 1000);
            }
        }
    }
    replaceRTP({ sequenceNumber, timestamp }) {
        if (this.sequenceNumber != undefined) {
            this.seqOffset = utils_1.uint16Add(this.sequenceNumber, -sequenceNumber);
        }
        if (this.timestamp != undefined) {
            this.timestampOffset = Number(utils_1.uint32Add(BigInt(this.timestamp), BigInt(-timestamp)));
        }
        this.rtpCache = [];
        log("replaceRTP", this.sequenceNumber, sequenceNumber, this.seqOffset);
    }
    sendRtp(rtp) {
        const { parameters } = this;
        if (!this.ready || !parameters)
            return;
        rtp = Buffer.isBuffer(rtp) ? src_1.RtpPacket.deSerialize(rtp) : rtp;
        const header = rtp.header;
        header.ssrc = this.ssrc;
        // todo : header.payloadType=parameters.codecs
        header.timestamp = Number(utils_1.uint32Add(BigInt(header.timestamp), BigInt(this.timestampOffset)));
        header.sequenceNumber = utils_1.uint16Add(header.sequenceNumber, this.seqOffset);
        this.timestamp = header.timestamp;
        this.sequenceNumber = header.sequenceNumber;
        this.cname = parameters.rtcp.cname;
        header.extensions = parameters.headerExtensions
            .map((extension) => {
            const payload = (() => {
                switch (extension.uri) {
                    case rtpExtension_1.RTP_EXTENSION_URI.sdesMid:
                        return Buffer.from(parameters.muxId);
                    case rtpExtension_1.RTP_EXTENSION_URI.sdesRTPStreamID:
                        if (parameters?.rid) {
                            return Buffer.from(parameters.rid);
                        }
                        return;
                    case rtpExtension_1.RTP_EXTENSION_URI.transportWideCC:
                        this.dtlsTransport.transportSequenceNumber = utils_1.uint16Add(this.dtlsTransport.transportSequenceNumber, 1);
                        return helper_1.bufferWriter([2], [this.dtlsTransport.transportSequenceNumber]);
                    case rtpExtension_1.RTP_EXTENSION_URI.absSendTime:
                        const buf = Buffer.alloc(3);
                        const time = (utils_1.ntpTime() >> 14n) & 0x00ffffffn;
                        buf.writeUIntBE(Number(time), 0, 3);
                        return buf;
                }
            })();
            if (payload)
                return { id: extension.id, payload };
        })
            .filter((v) => v);
        this.ntpTimestamp = utils_1.ntpTime();
        this.rtpTimestamp = rtp.header.timestamp;
        this.octetCount += rtp.payload.length;
        this.packetCount = Number(utils_1.uint32Add(BigInt(this.packetCount), 1n));
        rtp.header = header;
        this.rtpCache.push(rtp);
        this.rtpCache = this.rtpCache.slice(-RTP_HISTORY_SIZE);
        const size = this.dtlsTransport.sendRtp(rtp.payload, header);
        this.runRtcp();
        const sentInfo = {
            wideSeq: this.dtlsTransport.transportSequenceNumber,
            size,
            sendingAtMs: utils_1.milliTime(),
            sentAtMs: utils_1.milliTime(),
        };
        this.senderBWE.rtpPacketSent(sentInfo);
    }
    handleRtcpPacket(rtcpPacket) {
        switch (rtcpPacket.type) {
            case src_1.RtcpSrPacket.type:
            case src_1.RtcpRrPacket.type:
                {
                    const packet = rtcpPacket;
                    packet.reports
                        .filter((report) => report.ssrc === this.ssrc)
                        .forEach((report) => {
                        if (this.lsr === BigInt(report.lsr) && report.dlsr) {
                            const rtt = Date.now() / 1000 - this.lsrTime - report.dlsr / 65536;
                            if (this.rtt === undefined) {
                                this.rtt = rtt;
                            }
                            else {
                                this.rtt = RTT_ALPHA * this.rtt + (1 - RTT_ALPHA) * rtt;
                            }
                        }
                    });
                }
                break;
            case src_1.RtcpTransportLayerFeedback.type:
                {
                    const packet = rtcpPacket;
                    switch (packet.feedback.count) {
                        case src_1.TransportWideCC.count:
                            {
                                const feedback = packet.feedback;
                                this.senderBWE.receiveTWCC(feedback);
                            }
                            break;
                        case src_1.GenericNack.count:
                            {
                                const feedback = packet.feedback;
                                feedback.lost.forEach((seqNum) => {
                                    const rtp = this.rtpCache.find((rtp) => rtp.header.sequenceNumber === seqNum);
                                    if (rtp) {
                                        this.dtlsTransport.sendRtp(rtp.payload, rtp.header);
                                    }
                                });
                            }
                            break;
                    }
                }
                break;
        }
        this.onRtcp.execute(rtcpPacket);
    }
}
exports.RTCRtpSender = RTCRtpSender;
//# sourceMappingURL=rtpSender.js.map