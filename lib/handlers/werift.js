"use strict";
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Werift = void 0;
const tslib_1 = require("tslib");
const werift_1 = require("werift");
const utils = tslib_1.__importStar(require("../utils"));
const sdpTransform = tslib_1.__importStar(require("sdp-transform"));
const sdpCommonUtils = tslib_1.__importStar(require("./sdp/commonUtils"));
const sdpUnifiedPlanUtils = tslib_1.__importStar(require("./sdp/unifiedPlanUtils"));
const ortc = tslib_1.__importStar(require("../ortc"));
const RemoteSdp_1 = require("./sdp/RemoteSdp");
const Logger_1 = require("../Logger");
const HandlerInterface_1 = require("./HandlerInterface");
const logger = new Logger_1.Logger("werift");
const SCTP_NUM_STREAMS = { OS: 1024, MIS: 1024 };
class Werift extends HandlerInterface_1.HandlerInterface {
    constructor(nativeRtpCapabilities) {
        super();
        this.nativeRtpCapabilities = nativeRtpCapabilities;
        // Map of RTCTransceivers indexed by MID.
        this._mapMidTransceiver = new Map();
        this._hasDataChannelMediaSection = false;
        this._nextSendSctpStreamId = 0;
        this._transportReady = false;
    }
    static createFactory(nativeRtpCapabilities) {
        return () => new Werift(nativeRtpCapabilities);
    }
    get name() {
        return "werift";
    }
    close() {
        logger.debug("close()");
        // Close RTCPeerConnection.
        if (this._pc) {
            try {
                this._pc.close();
            }
            catch (error) { }
        }
    }
    async getNativeRtpCapabilities() {
        let preferredPayloadType = 96;
        const codecs = [
            ...(this.nativeRtpCapabilities.codecs.video || []).map(({ mimeType, clockRate, rtcpFeedback }) => {
                const codec = {
                    kind: "video",
                    mimeType,
                    clockRate,
                    rtcpFeedback,
                    preferredPayloadType: preferredPayloadType++,
                };
                return codec;
            }),
            ...(this.nativeRtpCapabilities.codecs.audio || []).map(({ mimeType, clockRate, channels }) => {
                const codec = {
                    kind: "audio",
                    mimeType,
                    clockRate,
                    channels,
                    preferredPayloadType: preferredPayloadType++,
                };
                return codec;
            }),
        ];
        let preferredId = 1;
        const headerExtensions = [
            ...(this.nativeRtpCapabilities.headerExtensions.audio || []).map(({ uri }) => {
                const ext = { uri, preferredId: preferredId++ };
                return ext;
            }),
            ...(this.nativeRtpCapabilities.headerExtensions.video || []).map(({ uri }) => {
                const ext = { uri, preferredId: preferredId++ };
                return ext;
            }),
        ];
        const caps = {
            codecs,
            headerExtensions,
        };
        return caps;
    }
    async getNativeSctpCapabilities() {
        logger.debug("getNativeSctpCapabilities()");
        return {
            numStreams: SCTP_NUM_STREAMS,
        };
    }
    run({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, proprietaryConstraints, extendedRtpCapabilities, }) {
        logger.debug("run()");
        this._direction = direction;
        this._remoteSdp = new RemoteSdp_1.RemoteSdp({
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
        });
        this._sendingRtpParametersByKind = {
            audio: ortc.getSendingRtpParameters("audio", extendedRtpCapabilities),
            video: ortc.getSendingRtpParameters("video", extendedRtpCapabilities),
        };
        this._sendingRemoteRtpParametersByKind = {
            audio: ortc.getSendingRemoteRtpParameters("audio", extendedRtpCapabilities),
            video: ortc.getSendingRemoteRtpParameters("video", extendedRtpCapabilities),
        };
        this._pc = new werift_1.RTCPeerConnection({
            iceServers: iceServers || [],
            iceTransportPolicy: iceTransportPolicy || "all",
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            sdpSemantics: "unified-plan",
            ...this.nativeRtpCapabilities,
            ...additionalSettings,
        });
        // Handle RTCPeerConnection connection status.
        this._pc.connectionStateChange.subscribe((state) => {
            switch (state) {
                case "connecting":
                    this.emit("@connectionstatechange", "connecting");
                    break;
                case "connected":
                    this.emit("@connectionstatechange", "connected");
                    break;
            }
        });
    }
    // todo impl
    async updateIceServers(iceServers) { }
    // todo impl
    async restartIce(iceParameters) { }
    // todo impl
    // @ts-expect-error
    async getTransportStats() { }
    async send({ track, encodings, codecOptions, codec, }) {
        this._assertSendDirection();
        logger.debug("send() [kind:%s, track.id:%s]", track.kind, track.id);
        if (encodings && encodings.length > 1) {
            encodings.forEach((encoding, idx) => {
                encoding.rid = `r${idx}`;
            });
        }
        const sendingRtpParameters = utils.clone(this._sendingRtpParametersByKind[track.kind], {});
        // This may throw.
        sendingRtpParameters.codecs = ortc.reduceCodecs(sendingRtpParameters.codecs, codec);
        const sendingRemoteRtpParameters = utils.clone(this._sendingRemoteRtpParametersByKind[track.kind], {});
        // This may throw.
        sendingRemoteRtpParameters.codecs = ortc.reduceCodecs(sendingRemoteRtpParameters.codecs, codec);
        const mediaSectionIdx = this._remoteSdp.getNextMediaSectionIdx();
        const transceiver = this._pc.addTransceiver(track, {
            direction: "sendonly",
        });
        const offer = await this._pc.createOffer();
        let localSdpObject = sdpTransform.parse(offer.sdp);
        let offerMediaObject;
        if (!this._transportReady) {
            await this._setupTransport({ localDtlsRole: "server", localSdpObject });
        }
        logger.debug("send() | calling pc.setLocalDescription() [offer:%o]", offer);
        await this._pc.setLocalDescription(offer);
        // We can now get the transceiver.mid.
        const localId = transceiver.mid;
        // Set MID.
        sendingRtpParameters.mid = localId;
        localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
        offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
        // Set RTCP CNAME.
        sendingRtpParameters.rtcp.cname = sdpCommonUtils.getCname({
            offerMediaObject,
        });
        // Set RTP encodings by parsing the SDP offer if no encodings are given.
        if (!encodings) {
            sendingRtpParameters.encodings = sdpUnifiedPlanUtils.getRtpEncodings({
                offerMediaObject,
            });
        }
        // Set RTP encodings by parsing the SDP offer and complete them with given
        // one if just a single encoding has been given.
        else if (encodings.length === 1) {
            const newEncodings = sdpUnifiedPlanUtils.getRtpEncodings({
                offerMediaObject,
            });
            Object.assign(newEncodings[0], encodings[0]);
            sendingRtpParameters.encodings = newEncodings;
        }
        // Otherwise if more than 1 encoding are given use them verbatim.
        else {
            sendingRtpParameters.encodings = encodings;
        }
        this._remoteSdp.send({
            offerMediaObject,
            reuseMid: mediaSectionIdx.reuseMid,
            offerRtpParameters: sendingRtpParameters,
            answerRtpParameters: sendingRemoteRtpParameters,
            codecOptions,
            extmapAllowMixed: true,
        });
        const answer = { type: "answer", sdp: this._remoteSdp.getSdp() };
        logger.debug("send() | calling pc.setRemoteDescription() [answer:%o]", answer);
        await this._pc.setRemoteDescription(answer);
        // Store in the map.
        this._mapMidTransceiver.set(localId, transceiver);
        return {
            localId: localId,
            rtpParameters: sendingRtpParameters,
            rtpSender: transceiver.sender,
        };
    }
    // todo impl
    async stopSending(localId) { }
    // todo impl
    async replaceTrack(localId, track) { }
    // todo impl
    async setMaxSpatialLayer(localId, spatialLayer) { }
    // todo impl
    async setRtpEncodingParameters(localId, params) { }
    // todo impl
    // @ts-expect-error
    async getSenderStats(localId) { }
    async sendDataChannel({ ordered, maxPacketLifeTime, maxRetransmits, label, protocol, priority, }) {
        this._assertSendDirection();
        const options = {
            negotiated: true,
            id: this._nextSendSctpStreamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            protocol,
            priority,
        };
        logger.debug("sendDataChannel() [options:%o]", options);
        const dataChannel = this._pc.createDataChannel(label || "", options);
        // Increase next id.
        this._nextSendSctpStreamId =
            ++this._nextSendSctpStreamId % SCTP_NUM_STREAMS.MIS;
        // If this is the first DataChannel we need to create the SDP answer with
        // m=application section.
        if (!this._hasDataChannelMediaSection) {
            const offer = await this._pc.createOffer();
            const localSdpObject = sdpTransform.parse(offer.sdp);
            const offerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            if (!this._transportReady)
                await this._setupTransport({ localDtlsRole: "server", localSdpObject });
            logger.debug("sendDataChannel() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            this._remoteSdp.sendSctpAssociation({ offerMediaObject });
            const answer = {
                type: "answer",
                sdp: this._remoteSdp.getSdp(),
            };
            logger.debug("sendDataChannel() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
            this._hasDataChannelMediaSection = true;
        }
        const sctpStreamParameters = {
            streamId: options.id,
            ordered: options.ordered,
            maxPacketLifeTime: options.maxPacketLifeTime,
            maxRetransmits: options.maxRetransmits,
        };
        return { dataChannel: dataChannel, sctpStreamParameters };
    }
    async receive({ trackId, kind, rtpParameters, }) {
        this._assertRecvDirection();
        logger.debug("receive() [trackId:%s, kind:%s]", trackId, kind);
        const localId = rtpParameters.mid || String(this._mapMidTransceiver.size);
        this._remoteSdp.receive({
            mid: localId,
            kind,
            offerRtpParameters: rtpParameters,
            streamId: rtpParameters.rtcp.cname,
            trackId,
        });
        const offer = new werift_1.RTCSessionDescription(this._remoteSdp.getSdp(), "offer");
        logger.debug("receive() | calling pc.setRemoteDescription() [offer:%o]", offer);
        await this._pc.setRemoteDescription(offer);
        let answer = await this._pc.createAnswer();
        const localSdpObject = sdpTransform.parse(answer.sdp);
        const answerMediaObject = localSdpObject.media.find((m) => String(m.mid) === localId);
        // May need to modify codec parameters in the answer based on codec
        // parameters in the offer.
        sdpCommonUtils.applyCodecParameters({
            offerRtpParameters: rtpParameters,
            answerMediaObject,
        });
        answer = new werift_1.RTCSessionDescription(sdpTransform.write(localSdpObject), "answer");
        if (!this._transportReady)
            await this._setupTransport({ localDtlsRole: "client", localSdpObject });
        logger.debug("receive() | calling pc.setLocalDescription() [answer:%o]", answer);
        await this._pc.setLocalDescription(answer);
        const transceiver = this._pc
            .getTransceivers()
            .find((t) => t.mid === localId);
        if (!transceiver)
            throw new Error("new RTCRtpTransceiver not found");
        // Store in the map.
        this._mapMidTransceiver.set(localId, transceiver);
        return {
            localId,
            // todo fix
            track: transceiver.receiver.tracks[0],
            // todo fix
            rtpReceiver: transceiver.receiver,
        };
    }
    async stopReceiving(localId) {
        this._assertRecvDirection();
        logger.debug("stopReceiving() [localId:%s]", localId);
        const transceiver = this._mapMidTransceiver.get(localId);
        if (!transceiver)
            throw new Error("associated RTCRtpTransceiver not found");
        this._remoteSdp.closeMediaSection(transceiver.mid);
        const offer = new werift_1.RTCSessionDescription(this._remoteSdp.getSdp(), "offer");
        logger.debug("stopReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
        await this._pc.setRemoteDescription(offer);
        const answer = await this._pc.createAnswer();
        logger.debug("stopReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
        await this._pc.setLocalDescription(answer);
    }
    // todo impl
    // @ts-expect-error
    async getReceiverStats(localId) { }
    async receiveDataChannel({ sctpStreamParameters, label, protocol, }) {
        this._assertRecvDirection();
        const { streamId, ordered, maxPacketLifeTime, maxRetransmits, } = sctpStreamParameters;
        const options = {
            negotiated: true,
            id: streamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            protocol,
        };
        logger.debug("receiveDataChannel() [options:%o]", options);
        const dataChannel = this._pc.createDataChannel(label || "", options);
        // If this is the first DataChannel we need to create the SDP offer with
        // m=application section.
        if (!this._hasDataChannelMediaSection) {
            this._remoteSdp.receiveSctpAssociation();
            const offer = { type: "offer", sdp: this._remoteSdp.getSdp() };
            logger.debug("receiveDataChannel() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            if (!this._transportReady) {
                const localSdpObject = sdpTransform.parse(answer.sdp);
                await this._setupTransport({ localDtlsRole: "client", localSdpObject });
            }
            logger.debug("receiveDataChannel() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
            this._hasDataChannelMediaSection = true;
        }
        return { dataChannel };
    }
    async _setupTransport({ localDtlsRole, localSdpObject, }) {
        if (!localSdpObject)
            localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
        // Get our local DTLS parameters.
        const dtlsParameters = sdpCommonUtils.extractDtlsParameters({
            sdpObject: localSdpObject,
        });
        // Set our DTLS role.
        dtlsParameters.role = localDtlsRole;
        // Update the remote DTLS role in the SDP.
        this._remoteSdp.updateDtlsRole(localDtlsRole === "client" ? "server" : "client");
        // Need to tell the remote transport about our parameters.
        await this.safeEmitAsPromise("@connect", { dtlsParameters });
        this._transportReady = true;
    }
    _assertSendDirection() {
        if (this._direction !== "send") {
            throw new Error('method can just be called for handlers with "send" direction');
        }
    }
    _assertRecvDirection() {
        if (this._direction !== "recv") {
            throw new Error('method can just be called for handlers with "recv" direction');
        }
    }
}
exports.Werift = Werift;
//# sourceMappingURL=werift.js.map