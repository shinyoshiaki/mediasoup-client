"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPeerConfig = exports.allocateMid = exports.addTransportDescription = exports.createMediaDescriptionForSctp = exports.createMediaDescriptionForTransceiver = exports.RTCPeerConnection = void 0;
const tslib_1 = require("tslib");
const lodash_1 = require("lodash");
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
const uuid = tslib_1.__importStar(require("uuid"));
const helper_1 = require("./helper");
const const_1 = require("./const");
const dataChannel_1 = require("./dataChannel");
const parameters_1 = require("./media/parameters");
const router_1 = require("./media/router");
const rtpReceiver_1 = require("./media/rtpReceiver");
const rtpSender_1 = require("./media/rtpSender");
const rtpTransceiver_1 = require("./media/rtpTransceiver");
const sdp_1 = require("./sdp");
const dtls_1 = require("./transport/dtls");
const ice_1 = require("./transport/ice");
const sctp_1 = require("./transport/sctp");
const utils_1 = require("./utils");
const debug_1 = tslib_1.__importDefault(require("debug"));
const log = debug_1.default("werift/webrtc/peerConnection");
class RTCPeerConnection extends helper_1.EventTarget {
    constructor({ codecs, headerExtensions, iceServers, iceTransportPolicy, } = {}) {
        super();
        this.cname = uuid.v4();
        this.masterTransportEstablished = false;
        this.configuration = lodash_1.cloneDeep(exports.defaultPeerConfig);
        this.connectionState = "new";
        this.iceConnectionState = "new";
        this.iceGatheringState = "new";
        this.signalingState = "stable";
        this.negotiationneeded = false;
        this.transceivers = [];
        this.iceGatheringStateChange = new rx_mini_1.default();
        this.iceConnectionStateChange = new rx_mini_1.default();
        this.signalingStateChange = new rx_mini_1.default();
        this.connectionStateChange = new rx_mini_1.default();
        this.onDataChannel = new rx_mini_1.default();
        this.onTransceiver = new rx_mini_1.default();
        this.onIceCandidate = new rx_mini_1.default();
        this.onnegotiationneeded = new rx_mini_1.default();
        this.ondatachannel = () => { };
        this.router = new router_1.RtpRouter();
        this.certificates = [];
        this.seenMid = new Set();
        this.isClosed = false;
        this.needNegotiation = () => {
            this.negotiationneeded = true;
            this.onnegotiationneeded.execute();
        };
        if (iceServers)
            this.configuration.iceServers = iceServers;
        if (iceTransportPolicy)
            this.configuration.iceTransportPolicy = iceTransportPolicy;
        if (codecs?.audio) {
            this.configuration.codecs.audio = codecs.audio;
        }
        if (codecs?.video) {
            this.configuration.codecs.video = codecs.video;
        }
        [
            ...(this.configuration.codecs.audio || []),
            ...(this.configuration.codecs.video || []),
        ].forEach((v, i) => {
            v.payloadType = 96 + i;
        });
        if (headerExtensions?.audio) {
            this.configuration.headerExtensions.audio = headerExtensions.audio;
        }
        if (headerExtensions?.video) {
            this.configuration.headerExtensions.video = headerExtensions.video;
        }
        [
            ...(this.configuration.headerExtensions.audio || []),
            ...(this.configuration.headerExtensions.video || []),
        ].forEach((v, i) => {
            v.id = 1 + i;
        });
        this.iceConnectionStateChange.subscribe((state) => {
            switch (state) {
                case "disconnected":
                    this.setConnectionState("disconnected");
                    break;
                case "closed":
                    this.close();
                    break;
            }
        });
        const { iceTransport, dtlsTransport } = this.createTransport([
            const_1.SRTP_PROFILE.SRTP_AES128_CM_HMAC_SHA1_80,
        ]);
        this.iceTransport = iceTransport;
        this.dtlsTransport = dtlsTransport;
    }
    get localDescription() {
        if (!this._localDescription)
            return;
        return this._localDescription.toJSON();
    }
    get remoteDescription() {
        if (!this._remoteDescription)
            return;
        return this._remoteDescription.toJSON();
    }
    get _localDescription() {
        return this.pendingLocalDescription || this.currentLocalDescription;
    }
    get _remoteDescription() {
        return this.pendingRemoteDescription || this.currentRemoteDescription;
    }
    getTransceiverByMid(mid) {
        return this.transceivers.find((transceiver) => transceiver.mid === mid);
    }
    getTransceiverByMLineIndex(index) {
        return this.transceivers.find((transceiver) => transceiver.mLineIndex === index);
    }
    async createOffer() {
        if ((!this.sctpTransport && this.transceivers.length === 0) ||
            !this.dtlsTransport)
            throw new Error("Cannot create an offer with no media and no data channels");
        if (this.certificates.length === 0) {
            await this.dtlsTransport.setupCertificate();
        }
        this.transceivers.forEach((transceiver) => {
            transceiver.codecs = this.configuration.codecs[transceiver.kind];
            transceiver.headerExtensions = this.configuration.headerExtensions[transceiver.kind];
        });
        const description = new sdp_1.SessionDescription();
        sdp_1.addSDPHeader("offer", description);
        // # handle existing transceivers / sctp
        const currentMedia = this._localDescription
            ? this._localDescription.media
            : [];
        currentMedia.forEach((m, i) => {
            const mid = m.rtp.muxId;
            if (!mid) {
                log("mid missing", m);
                return;
            }
            if (m.kind === "application") {
                description.media.push(createMediaDescriptionForSctp(this.sctpTransport, mid));
            }
            else {
                const transceiver = this.getTransceiverByMid(mid);
                if (!transceiver) {
                    log("transceiver by mid not found", mid);
                    return;
                }
                transceiver.mLineIndex = i;
                description.media.push(createMediaDescriptionForTransceiver(transceiver, this.cname, transceiver.direction, mid));
            }
        });
        // # handle new transceivers / sctp
        this.transceivers
            .filter((t) => !description.media.find((m) => m.rtp.muxId === t.mid))
            .forEach((transceiver) => {
            transceiver.mLineIndex = description.media.length;
            description.media.push(createMediaDescriptionForTransceiver(transceiver, this.cname, transceiver.direction, allocateMid(this.seenMid)));
        });
        if (this.sctpTransport &&
            !description.media.find((m) => this.sctpTransport.mid === m.rtp.muxId)) {
            description.media.push(createMediaDescriptionForSctp(this.sctpTransport, allocateMid(this.seenMid)));
        }
        const mids = description.media
            .map((m) => m.rtp.muxId)
            .filter((v) => v);
        const bundle = new sdp_1.GroupDescription("BUNDLE", mids);
        description.group.push(bundle);
        return description.toJSON();
    }
    createDataChannel(label, options = {}) {
        const base = {
            protocol: "",
            ordered: true,
            negotiated: false,
        };
        const settings = { ...base, ...options };
        if (settings.maxPacketLifeTime && settings.maxRetransmits)
            throw new Error("can not select both");
        if (!this.sctpTransport) {
            this.sctpTransport = this.createSctpTransport();
        }
        const parameters = new dataChannel_1.RTCDataChannelParameters({
            id: settings.id,
            label,
            maxPacketLifeTime: settings.maxPacketLifeTime,
            maxRetransmits: settings.maxRetransmits,
            negotiated: settings.negotiated,
            ordered: settings.ordered,
            protocol: settings.protocol,
        });
        return new dataChannel_1.RTCDataChannel(this.sctpTransport, parameters);
    }
    removeTrack(sender) {
        if (this.isClosed)
            throw new Error("peer closed");
        if (!this.getSenders().find(({ ssrc }) => sender.ssrc === ssrc))
            throw new Error("unExist");
        const transceiver = this.transceivers.find(({ sender: { ssrc } }) => sender.ssrc === ssrc);
        if (!transceiver)
            throw new Error("unExist");
        sender.stop();
        if (transceiver.currentDirection === "recvonly") {
            this.needNegotiation();
            return;
        }
        if (transceiver.direction === "sendrecv") {
            transceiver.direction = "recvonly";
        }
        else if (transceiver.direction === "sendonly" ||
            transceiver.direction === "recvonly") {
            transceiver.direction = "inactive";
        }
        this.needNegotiation();
    }
    createTransport(srtpProfiles = []) {
        const iceGatherer = new ice_1.RTCIceGatherer({
            ...utils_1.parseIceServers(this.configuration.iceServers),
            forceTurn: this.configuration.iceTransportPolicy === "relay",
        });
        iceGatherer.onGatheringStateChange.subscribe((state) => {
            this.updateIceGatheringState(state);
        });
        this.updateIceGatheringState(iceGatherer.gatheringState);
        const iceTransport = new ice_1.RTCIceTransport(iceGatherer);
        iceTransport.onStateChange.subscribe((state) => {
            this.updateIceConnectionState(state);
        });
        this.updateIceConnectionState(iceTransport.state);
        iceTransport.iceGather.onIceCandidate = (candidate) => {
            if (!this.localDescription)
                return;
            const sdp = sdp_1.SessionDescription.parse(this.localDescription.sdp);
            const media = sdp.media[0];
            candidate.sdpMLineIndex = 0;
            candidate.sdpMid = media.rtp.muxId;
            // for chrome & firefox & maybe others
            candidate.foundation = "candidate:" + candidate.foundation;
            this.onIceCandidate.execute(candidate);
            this.emit("icecandidate", { candidate });
        };
        const dtlsTransport = new dtls_1.RTCDtlsTransport(iceTransport, this.router, this.certificates, srtpProfiles);
        return { dtlsTransport, iceTransport };
    }
    createSctpTransport() {
        const sctp = new sctp_1.RTCSctpTransport(this.dtlsTransport);
        sctp.mid = undefined;
        sctp.onDataChannel.subscribe((channel) => {
            this.onDataChannel.execute(channel);
            if (this.ondatachannel) {
                this.ondatachannel({ channel });
            }
            this.emit("datachannel", { channel });
        });
        return sctp;
    }
    async setLocalDescription(sessionDescription) {
        const { dtlsTransport } = this;
        if (!dtlsTransport)
            throw new Error("seems no media");
        // # parse and validate description
        const description = sdp_1.SessionDescription.parse(sessionDescription.sdp);
        description.type = sessionDescription.type;
        this.validateDescription(description, true);
        // # update signaling state
        if (description.type === "offer") {
            this.setSignalingState("have-local-offer");
        }
        else if (description.type === "answer") {
            this.setSignalingState("stable");
        }
        // # assign MID
        description.media.forEach((media, i) => {
            const mid = media.rtp.muxId;
            if (!mid) {
                log("mid missing");
                return;
            }
            this.seenMid.add(mid);
            if (["audio", "video"].includes(media.kind)) {
                const transceiver = this.getTransceiverByMLineIndex(i);
                if (transceiver) {
                    transceiver.mid = mid;
                }
            }
            if (media.kind === "application" && this.sctpTransport) {
                this.sctpTransport.mid = mid;
            }
        });
        // # set ICE role
        if (description.type === "offer") {
            this.iceTransport.connection.iceControlling = true;
        }
        else {
            this.iceTransport.connection.iceControlling = false;
        }
        // One agent full, one lite:  The full agent MUST take the controlling role, and the lite agent MUST take the controlled role
        // RFC 8445 S6.1.1
        if (this.iceTransport.connection.remoteIsLite) {
            this.iceTransport.connection.iceControlling = true;
        }
        // # set DTLS role for mediasoup
        if (description.type === "answer") {
            const role = description.media.find((media) => media.dtlsParams)
                ?.dtlsParams?.role;
            if (role) {
                dtlsTransport.role = role;
            }
        }
        // # configure direction
        this.transceivers.forEach((t) => {
            if (["answer", "pranswer"].includes(description.type)) {
                const direction = utils_1.andDirection(t.direction, t.offerDirection);
                t.currentDirection = direction;
            }
        });
        // for trickle ice
        this.setLocal(description);
        // # gather candidates
        await dtlsTransport.iceTransport.iceGather.gather();
        description.media.map((media) => {
            addTransportDescription(media, dtlsTransport);
        });
        this.setLocal(description);
        // connect transports
        if (description.type === "answer") {
            this.connect().catch((err) => {
                log("connect failed", err);
                this.setConnectionState("failed");
            });
        }
        return this.localDescription;
    }
    setLocal(description) {
        if (description.type === "answer") {
            this.currentLocalDescription = description;
            this.pendingLocalDescription = undefined;
        }
        else {
            this.pendingLocalDescription = description;
        }
    }
    async addIceCandidate(candidateMessage) {
        const candidate = ice_1.RTCIceCandidate.fromJSON(candidateMessage);
        await this.iceTransport.addRemoteCandidate(candidate);
    }
    async connect() {
        if (this.masterTransportEstablished || !this.dtlsTransport)
            return;
        const dtlsTransport = this.dtlsTransport;
        const iceTransport = dtlsTransport.iceTransport;
        if (this.remoteIce && this.remoteDtls) {
            this.setConnectionState("connecting");
            await iceTransport.start(this.remoteIce).catch((err) => {
                log("iceTransport.start failed", err);
                throw err;
            });
            log("ice connected");
            await dtlsTransport.start(this.remoteDtls);
            if (this.sctpTransport && this.sctpRemotePort) {
                await this.sctpTransport.start(this.sctpRemotePort);
                await this.sctpTransport.sctp.stateChanged.connected.asPromise();
            }
            this.masterTransportEstablished = true;
            this.setConnectionState("connected");
        }
    }
    localRtp(transceiver) {
        const rtp = new parameters_1.RTCRtpParameters({
            muxId: transceiver.mid,
            headerExtensions: transceiver.headerExtensions,
            rtcp: { cname: this.cname, ssrc: transceiver.sender.ssrc, mux: true },
        });
        return rtp;
    }
    remoteRtp(transceiver) {
        const media = this._remoteDescription.media[transceiver.mLineIndex];
        const receiveParameters = new parameters_1.RTCRtpReceiveParameters({
            codecs: transceiver.codecs,
            muxId: media.rtp.muxId,
            rtcp: media.rtp.rtcp,
        });
        const encodings = transceiver.codecs.map((codec) => new parameters_1.RTCRtpCodingParameters({
            ssrc: media.ssrc[0]?.ssrc,
            payloadType: codec.payloadType,
        }));
        receiveParameters.encodings = encodings;
        receiveParameters.headerExtensions = transceiver.headerExtensions;
        return receiveParameters;
    }
    validateDescription(description, isLocal) {
        if (isLocal) {
            if (description.type === "offer") {
                if (!["stable", "have-local-offer"].includes(this.signalingState))
                    throw new Error("Cannot handle offer in signaling state");
            }
            else if (description.type === "answer") {
                if (!["have-remote-offer", "have-local-pranswer"].includes(this.signalingState)) {
                    throw new Error("Cannot handle answer in signaling state");
                }
            }
        }
        else {
            if (description.type === "offer") {
                if (!["stable", "have-remote-offer"].includes(this.signalingState)) {
                    throw new Error("Cannot handle offer in signaling state");
                }
            }
            else if (description.type === "answer") {
                if (!["have-local-offer", "have-remote-pranswer"].includes(this.signalingState)) {
                    throw new Error("Cannot handle answer in signaling state");
                }
            }
        }
        description.media.forEach((media) => {
            if (media.direction === "inactive")
                return;
            if (!media.iceParams ||
                !media.iceParams.usernameFragment ||
                !media.iceParams.password)
                throw new Error("ICE username fragment or password is missing");
        });
        if (["answer", "pranswer"].includes(description.type || "")) {
            const offer = isLocal ? this._remoteDescription : this._localDescription;
            if (!offer)
                throw new Error();
            const offerMedia = offer.media.map((v) => [v.kind, v.rtp.muxId]);
            const answerMedia = description.media.map((v) => [v.kind, v.rtp.muxId]);
            if (!lodash_1.isEqual(offerMedia, answerMedia))
                throw new Error("Media sections in answer do not match offer");
        }
    }
    async setRemoteDescription(sessionDescription) {
        // # parse and validate description
        const description = sdp_1.SessionDescription.parse(sessionDescription.sdp);
        description.type = sessionDescription.type;
        this.validateDescription(description, false);
        // # apply description
        for (const [i, media] of helper_1.enumerate(description.media)) {
            if (["audio", "video"].includes(media.kind)) {
                const transceiver = this.transceivers.find((t) => t.kind === media.kind &&
                    [undefined, media.rtp.muxId].includes(t.mid)) ||
                    (() => {
                        const transceiver = this.addTransceiver(media.kind, {
                            direction: "recvonly",
                        });
                        this.onTransceiver.execute(transceiver);
                        return transceiver;
                    })();
                // simulcast
                media.simulcastParameters.forEach((param) => {
                    this.router.registerRtpReceiverByRid(transceiver, param);
                });
                if (!transceiver.mid) {
                    transceiver.mid = media.rtp.muxId;
                    transceiver.mLineIndex = i;
                }
                // # negotiate codecs
                log("remote codecs", media.rtp.codecs);
                transceiver.codecs = media.rtp.codecs.filter((remoteCodec) => (this.configuration.codecs[media.kind] || []).find((localCodec) => localCodec.mimeType.toLowerCase() ===
                    remoteCodec.mimeType.toLowerCase()));
                log("negotiated codecs", transceiver.codecs);
                if (transceiver.codecs.length === 0) {
                    throw new Error("negotiate codecs failed.");
                }
                transceiver.headerExtensions = media.rtp.headerExtensions.filter((extension) => (this.configuration.headerExtensions[media.kind] || []).find((v) => v.uri === extension.uri));
                transceiver.receiver.setupTWCC(media.ssrc[0]?.ssrc);
                // # configure direction
                const direction = utils_1.reverseDirection(media.direction || "inactive");
                if (["answer", "pranswer"].includes(description.type)) {
                    transceiver.currentDirection = direction;
                }
                else {
                    transceiver.offerDirection = direction;
                }
            }
            else if (media.kind === "application") {
                if (!this.sctpTransport) {
                    this.sctpTransport = this.createSctpTransport();
                }
                if (!this.sctpTransport.mid) {
                    this.sctpTransport.mid = media.rtp.muxId;
                }
                // # configure sctp
                this.sctpRemotePort = media.sctpPort;
            }
            if (media.dtlsParams && media.iceParams) {
                this.remoteDtls = media.dtlsParams;
                this.remoteIce = media.iceParams;
            }
            // One agent full, one lite:  The full agent MUST take the controlling role, and the lite agent MUST take the controlled role
            // RFC 8445 S6.1.1
            if (media.iceParams?.iceLite) {
                this.iceTransport.connection.iceControlling = true;
            }
            // # add ICE candidates
            media.iceCandidates.forEach(this.iceTransport.addRemoteCandidate);
            await this.iceTransport.iceGather.gather();
            if (media.iceCandidatesComplete) {
                await this.iceTransport.addRemoteCandidate(undefined);
            }
            // # set DTLS role
            if (description.type === "answer" && media.dtlsParams?.role) {
                this.dtlsTransport.role =
                    media.dtlsParams.role === "client" ? "server" : "client";
            }
        }
        // connect transports
        if (description.type === "answer") {
            this.connect().catch((err) => {
                log("connect failed", err);
                this.setConnectionState("failed");
            });
        }
        if (description.type === "offer") {
            this.setSignalingState("have-remote-offer");
        }
        else if (description.type === "answer") {
            this.setSignalingState("stable");
        }
        if (description.type === "answer") {
            this.currentRemoteDescription = description;
            this.pendingRemoteDescription = undefined;
        }
        else {
            this.pendingRemoteDescription = description;
        }
        this.transceivers.forEach((transceiver) => {
            transceiver.sender.parameters = this.localRtp(transceiver);
            if (["recvonly", "sendrecv"].includes(transceiver.direction)) {
                const params = this.remoteRtp(transceiver);
                this.router.registerRtpReceiverBySsrc(transceiver, params);
            }
        });
    }
    addTransceiver(trackOrKind, options = {}) {
        const kind = typeof trackOrKind === "string" ? trackOrKind : trackOrKind.kind;
        const direction = options.direction || "sendrecv";
        const sender = new rtpSender_1.RTCRtpSender(trackOrKind, this.dtlsTransport);
        const receiver = new rtpReceiver_1.RTCRtpReceiver(kind, this.dtlsTransport, sender.ssrc);
        const transceiver = new rtpTransceiver_1.RTCRtpTransceiver(kind, receiver, sender, direction, this.dtlsTransport);
        transceiver.options = options;
        this.router.registerRtpSender(transceiver.sender);
        this.transceivers.push(transceiver);
        return transceiver;
    }
    getTransceivers() {
        return this.transceivers;
    }
    getSenders() {
        return this.getTransceivers().map((t) => t.sender);
    }
    getReceivers() {
        return this.getTransceivers().map((t) => t.receiver);
    }
    addTrack(track) {
        if (this.isClosed)
            throw new Error("is closed");
        if (this.getSenders().find((sender) => sender.track?.id === track.id))
            throw new Error("track exist");
        const emptyTrackSender = this.transceivers.find((t) => t.sender.track == undefined &&
            t.kind === track.kind &&
            const_1.SenderDirections.includes(t.direction) === true);
        if (emptyTrackSender) {
            const sender = emptyTrackSender.sender;
            sender.registerTrack(track);
            this.needNegotiation();
            return sender;
        }
        const notSendTransceiver = this.transceivers.find((t) => t.sender.track == undefined &&
            t.kind === track.kind &&
            const_1.SenderDirections.includes(t.direction) === false &&
            !t.usedForSender);
        if (notSendTransceiver) {
            const sender = notSendTransceiver.sender;
            sender.registerTrack(track);
            switch (notSendTransceiver.direction) {
                case "recvonly":
                    notSendTransceiver.direction = "sendrecv";
                    break;
                case "inactive":
                    notSendTransceiver.direction = "sendonly";
                    break;
            }
            this.needNegotiation();
            return sender;
        }
        else {
            const transceiver = this.addTransceiver(track, { direction: "sendrecv" });
            this.needNegotiation();
            return transceiver.sender;
        }
    }
    async createAnswer() {
        this.assertNotClosed();
        if (!["have-remote-offer", "have-local-pranswer"].includes(this.signalingState) ||
            !this.dtlsTransport)
            throw new Error("createAnswer failed");
        if (this.certificates.length === 0) {
            await this.dtlsTransport.setupCertificate();
        }
        const description = new sdp_1.SessionDescription();
        sdp_1.addSDPHeader("answer", description);
        this._remoteDescription?.media.forEach((remoteM) => {
            let dtlsTransport;
            let media;
            if (["audio", "video"].includes(remoteM.kind)) {
                const transceiver = this.getTransceiverByMid(remoteM.rtp.muxId);
                media = createMediaDescriptionForTransceiver(transceiver, this.cname, utils_1.andDirection(transceiver.direction, transceiver.offerDirection), transceiver.mid);
                if (!transceiver.dtlsTransport)
                    throw new Error();
                dtlsTransport = transceiver.dtlsTransport;
            }
            else if (remoteM.kind === "application") {
                if (!this.sctpTransport || !this.sctpTransport.mid)
                    throw new Error();
                media = createMediaDescriptionForSctp(this.sctpTransport, this.sctpTransport.mid);
                dtlsTransport = this.sctpTransport.dtlsTransport;
            }
            else
                throw new Error();
            // # determine DTLS role, or preserve the currently configured role
            if (!media.dtlsParams)
                throw new Error();
            if (dtlsTransport.role === "auto") {
                media.dtlsParams.role = "client";
            }
            else {
                media.dtlsParams.role = dtlsTransport.role;
            }
            media.simulcastParameters = remoteM.simulcastParameters.map((v) => ({
                ...v,
                direction: utils_1.reverseSimulcastDirection(v.direction),
            }));
            description.media.push(media);
        });
        const bundle = new sdp_1.GroupDescription("BUNDLE", []);
        description.media.forEach((media) => {
            bundle.items.push(media.rtp.muxId);
        });
        description.group.push(bundle);
        return description.toJSON();
    }
    async close() {
        if (this.isClosed)
            return;
        this.isClosed = true;
        this.setSignalingState("closed");
        this.setConnectionState("closed");
        this.transceivers.forEach((transceiver) => {
            transceiver.receiver.stop();
            transceiver.sender.stop();
        });
        if (this.sctpTransport) {
            await this.sctpTransport.stop();
        }
        if (this.dtlsTransport) {
            await this.dtlsTransport.stop();
            await this.dtlsTransport.iceTransport.stop();
        }
        this.dispose();
        log("peerConnection closed");
    }
    assertNotClosed() {
        if (this.isClosed)
            throw new Error("RTCPeerConnection is closed");
    }
    updateIceGatheringState(state) {
        log("iceGatheringStateChange", state);
        this.iceGatheringState = state;
        this.iceGatheringStateChange.execute(state);
        this.emit("icegatheringstatechange", state);
    }
    updateIceConnectionState(state) {
        log("iceConnectionStateChange", state);
        this.iceConnectionState = state;
        this.iceConnectionStateChange.execute(state);
        this.emit("iceconnectionstatechange", state);
    }
    setSignalingState(state) {
        log("signalingStateChange", state);
        this.signalingState = state;
        this.signalingStateChange.execute(state);
    }
    setConnectionState(state) {
        log("connectionStateChange", state);
        this.connectionState = state;
        this.connectionStateChange.execute(state);
        this.emit("connectionstatechange");
    }
    dispose() {
        this.onDataChannel.allUnsubscribe();
        this.iceGatheringStateChange.allUnsubscribe();
        this.iceConnectionStateChange.allUnsubscribe();
        this.signalingStateChange.allUnsubscribe();
        this.onTransceiver.allUnsubscribe();
        this.onIceCandidate.allUnsubscribe();
    }
}
exports.RTCPeerConnection = RTCPeerConnection;
function createMediaDescriptionForTransceiver(transceiver, cname, direction, mid) {
    const media = new sdp_1.MediaDescription(transceiver.kind, 9, "UDP/TLS/RTP/SAVPF", transceiver.codecs.map((c) => c.payloadType));
    media.direction = direction;
    media.msid = transceiver.msid;
    media.rtp = new parameters_1.RTCRtpParameters({
        codecs: transceiver.codecs,
        headerExtensions: transceiver.headerExtensions,
        muxId: mid,
    });
    media.rtcpHost = "0.0.0.0";
    media.rtcpPort = 9;
    media.rtcpMux = true;
    media.ssrc = [new sdp_1.SsrcDescription({ ssrc: transceiver.sender.ssrc, cname })];
    if (transceiver.options.simulcast) {
        media.simulcastParameters = transceiver.options.simulcast.map((o) => new parameters_1.RTCRtpSimulcastParameters(o));
    }
    addTransportDescription(media, transceiver.dtlsTransport);
    return media;
}
exports.createMediaDescriptionForTransceiver = createMediaDescriptionForTransceiver;
function createMediaDescriptionForSctp(sctp, mid) {
    const media = new sdp_1.MediaDescription("application", const_1.DISCARD_PORT, "UDP/DTLS/SCTP", ["webrtc-datachannel"]);
    media.sctpPort = sctp.port;
    media.rtp.muxId = mid;
    media.sctpCapabilities = sctp_1.RTCSctpTransport.getCapabilities();
    addTransportDescription(media, sctp.dtlsTransport);
    return media;
}
exports.createMediaDescriptionForSctp = createMediaDescriptionForSctp;
function addTransportDescription(media, dtlsTransport) {
    const iceTransport = dtlsTransport.iceTransport;
    const iceGatherer = iceTransport.iceGather;
    media.iceCandidates = iceGatherer.localCandidates;
    media.iceCandidatesComplete = iceGatherer.gatheringState === "complete";
    media.iceParams = iceGatherer.localParameters;
    media.iceOptions = "trickle";
    if (media.iceCandidates.length > 0) {
        const candidate = media.iceCandidates[media.iceCandidates.length - 1];
        media.host = candidate.ip;
        media.port = candidate.port;
    }
    else {
        media.host = const_1.DISCARD_HOST;
        media.port = const_1.DISCARD_PORT;
    }
    if (media.direction === "inactive") {
        media.port = 0;
    }
    if (!media.dtlsParams) {
        media.dtlsParams = dtlsTransport.localParameters;
        if (!media.dtlsParams.fingerprints) {
            media.dtlsParams.fingerprints =
                dtlsTransport.localParameters.fingerprints;
        }
    }
}
exports.addTransportDescription = addTransportDescription;
function allocateMid(mids) {
    let mid = "";
    for (let i = 0;;) {
        mid = (i++).toString();
        if (!mids.has(mid))
            break;
    }
    mids.add(mid);
    return mid;
}
exports.allocateMid = allocateMid;
exports.defaultPeerConfig = {
    codecs: {
        audio: [
            new parameters_1.RTCRtpCodecParameters({
                mimeType: "audio/opus",
                clockRate: 48000,
                channels: 2,
            }),
            new parameters_1.RTCRtpCodecParameters({
                mimeType: "audio/PCMU",
                clockRate: 8000,
                channels: 1,
            }),
        ],
        video: [
            new parameters_1.RTCRtpCodecParameters({
                mimeType: "video/VP8",
                clockRate: 90000,
                rtcpFeedback: [
                    { type: "ccm", parameter: "fir" },
                    { type: "nack" },
                    { type: "nack", parameter: "pli" },
                    { type: "goog-remb" },
                ],
            }),
        ],
    },
    headerExtensions: { audio: [], video: [] },
    iceTransportPolicy: "all",
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
//# sourceMappingURL=peerConnection.js.map