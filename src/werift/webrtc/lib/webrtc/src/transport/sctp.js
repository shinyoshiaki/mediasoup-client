"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTCSctpCapabilities = exports.RTCSctpTransport = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const jspack_1 = require("jspack");
const rx_mini_1 = require("rx.mini");
const uuid = tslib_1.__importStar(require("uuid"));
const src_1 = require("../../../sctp/src");
const const_1 = require("../const");
const dataChannel_1 = require("../dataChannel");
const log = debug_1.default("werift/webrtc/transport/sctp");
class RTCSctpTransport {
    constructor(dtlsTransport, port = 5000) {
        this.dtlsTransport = dtlsTransport;
        this.port = port;
        this.onDataChannel = new rx_mini_1.Event();
        this.uuid = uuid.v4();
        this.sctp = new src_1.SCTP(new BridgeDtls(this.dtlsTransport), this.port);
        this.bundled = false;
        this.dataChannels = {};
        this.dataChannelQueue = [];
        this.datachannelReceive = async (streamId, ppId, data) => {
            if (ppId === const_1.WEBRTC_DCEP && data.length > 0) {
                log("DCEP", streamId, ppId, data);
                switch (data[0]) {
                    case const_1.DATA_CHANNEL_OPEN:
                        {
                            if (data.length >= 12) {
                                if (Object.keys(this.dataChannels).includes(streamId.toString()))
                                    throw new Error();
                                const [, channelType, , reliability, labelLength, protocolLength,] = jspack_1.jspack.Unpack("!BBHLHH", data);
                                let pos = 12;
                                const label = data.slice(pos, pos + labelLength).toString("utf8");
                                pos += labelLength;
                                const protocol = data
                                    .slice(pos, pos + protocolLength)
                                    .toString("utf8");
                                log("DATA_CHANNEL_OPEN", {
                                    channelType,
                                    reliability,
                                    streamId,
                                    label,
                                    protocol,
                                });
                                const maxRetransmits = (channelType & 0x03) === 1 ? reliability : undefined;
                                const maxPacketLifeTime = (channelType & 0x03) === 2 ? reliability : undefined;
                                // # register channel
                                const parameters = new dataChannel_1.RTCDataChannelParameters({
                                    label,
                                    ordered: (channelType & 0x80) === 0,
                                    maxPacketLifeTime,
                                    maxRetransmits,
                                    protocol,
                                    id: streamId,
                                });
                                const channel = new dataChannel_1.RTCDataChannel(this, parameters, false);
                                channel.isCreatedByRemote = true;
                                this.dataChannels[streamId] = channel;
                                this.dataChannelQueue.push([
                                    channel,
                                    const_1.WEBRTC_DCEP,
                                    Buffer.from(jspack_1.jspack.Pack("!B", [const_1.DATA_CHANNEL_ACK])),
                                ]);
                                this.onDataChannel.execute(channel);
                                channel.setReadyState("open");
                                await this.dataChannelFlush();
                            }
                        }
                        break;
                    case const_1.DATA_CHANNEL_ACK:
                        log("DATA_CHANNEL_ACK");
                        const channel = this.dataChannels[streamId];
                        if (!channel)
                            throw new Error();
                        channel.setReadyState("open");
                        break;
                }
            }
            else {
                const channel = this.dataChannels[streamId];
                if (channel) {
                    const msg = (() => {
                        switch (ppId) {
                            case const_1.WEBRTC_STRING:
                                return data.toString("utf8");
                            case const_1.WEBRTC_STRING_EMPTY:
                                return "";
                            case const_1.WEBRTC_BINARY:
                                return data;
                            case const_1.WEBRTC_BINARY_EMPTY:
                                return Buffer.from([]);
                            default:
                                throw new Error();
                        }
                    })();
                    channel.message.execute(msg);
                    channel.emit("message", { data: msg });
                }
            }
        };
        this.datachannelSend = (channel, data) => {
            channel.addBufferedAmount(data.length);
            this.dataChannelQueue.push(typeof data === "string"
                ? [channel, const_1.WEBRTC_STRING, Buffer.from(data)]
                : [channel, const_1.WEBRTC_BINARY, data]);
            if (this.sctp.associationState !== src_1.SCTP_STATE.ESTABLISHED) {
                log("sctp not established", this.sctp.associationState);
            }
            this.dataChannelFlush();
        };
        this.sctp.onReceive.subscribe(this.datachannelReceive);
        this.sctp.onReconfigStreams.subscribe((ids) => {
            ids.forEach((id) => {
                const dc = this.dataChannels[id];
                if (!dc)
                    return;
                // todo fix
                dc.setReadyState("closing");
                dc.setReadyState("closed");
                delete this.dataChannels[id];
            });
        });
        this.sctp.stateChanged.connected.subscribe(() => {
            Object.values(this.dataChannels).forEach((channel) => {
                if (channel.negotiated && channel.readyState !== "open") {
                    channel.setReadyState("open");
                }
            });
            this.dataChannelFlush();
        });
        this.sctp.stateChanged.closed.subscribe(() => {
            Object.values(this.dataChannels).forEach((dc) => {
                dc.setReadyState("closed");
            });
            this.dataChannels = {};
        });
        this.sctp.onSackReceived = async () => {
            await this.dataChannelFlush();
        };
        this.dtlsTransport.onStateChange.subscribe((state) => {
            if (state === "closed") {
                this.sctp.setState(src_1.SCTP_STATE.CLOSED);
            }
        });
    }
    get isServer() {
        return this.dtlsTransport.iceTransport.role !== "controlling";
    }
    channelByLabel(label) {
        return Object.values(this.dataChannels).find((d) => d.label === label);
    }
    dataChannelAddNegotiated(channel) {
        if (channel.id == undefined) {
            throw new Error();
        }
        if (this.dataChannels[channel.id]) {
            throw new Error();
        }
        this.dataChannels[channel.id] = channel;
        if (this.sctp.associationState === src_1.SCTP_STATE.ESTABLISHED) {
            channel.setReadyState("open");
        }
    }
    dataChannelOpen(channel) {
        if (channel.id) {
            if (this.dataChannels[channel.id])
                throw new Error(`Data channel with ID ${channel.id} already registered`);
            this.dataChannels[channel.id] = channel;
        }
        let channelType = const_1.DATA_CHANNEL_RELIABLE;
        const priority = 0;
        let reliability = 0;
        if (!channel.ordered) {
            channelType = 0x80;
        }
        if (channel.maxRetransmits) {
            channelType = 1;
            reliability = channel.maxRetransmits;
        }
        else if (channel.maxPacketLifeTime) {
            channelType = 2;
            reliability = channel.maxPacketLifeTime;
        }
        // 5.1.  DATA_CHANNEL_OPEN Message
        const data = jspack_1.jspack.Pack("!BBHLHH", [
            const_1.DATA_CHANNEL_OPEN,
            channelType,
            priority,
            reliability,
            channel.label.length,
            channel.protocol.length,
        ]);
        const send = Buffer.concat([
            Buffer.from(data),
            Buffer.from(channel.label, "utf8"),
            Buffer.from(channel.protocol, "utf8"),
        ]);
        this.dataChannelQueue.push([channel, const_1.WEBRTC_DCEP, send]);
        this.dataChannelFlush();
    }
    async dataChannelFlush() {
        // """
        // Try to flush buffered data to the SCTP layer.
        // We wait until the association is established, as we need to know
        // whether we are a client or a server to correctly assign an odd/even ID
        // to the data channels.
        // """
        if (this.sctp.associationState != src_1.SCTP_STATE.ESTABLISHED)
            return;
        if (this.sctp.outboundQueue.length > 0)
            return;
        while (this.dataChannelQueue.length > 0) {
            const [channel, protocol, userData] = this.dataChannelQueue.shift();
            let streamId = channel.id;
            if (streamId === undefined) {
                streamId = this.dataChannelId;
                while (Object.keys(this.dataChannels).includes(streamId.toString())) {
                    streamId += 2;
                }
                this.dataChannels[streamId] = channel;
                channel.setId(streamId);
            }
            if (protocol === const_1.WEBRTC_DCEP) {
                await this.sctp.send(streamId, protocol, userData);
            }
            else {
                const expiry = channel.maxPacketLifeTime
                    ? Date.now() + channel.maxPacketLifeTime / 1000
                    : undefined;
                await this.sctp.send(streamId, protocol, userData, expiry, channel.maxRetransmits, channel.ordered);
                channel.addBufferedAmount(-userData.length);
            }
        }
    }
    static getCapabilities() {
        return new RTCSctpCapabilities(65536);
    }
    async start(remotePort) {
        if (this.isServer) {
            this.dataChannelId = 0;
        }
        else {
            this.dataChannelId = 1;
        }
        this.sctp.isServer = this.isServer;
        await this.sctp.start(remotePort);
    }
    async stop() {
        this.dtlsTransport.dataReceiver = undefined;
        await this.sctp.stop();
    }
    dataChannelClose(channel) {
        if (!["closing", "closed"].includes(channel.readyState)) {
            channel.setReadyState("closing");
            if (this.sctp.associationState === src_1.SCTP_STATE.ESTABLISHED) {
                this.sctp.reconfigQueue.push(channel.id);
                if (this.sctp.reconfigQueue.length === 1) {
                    this.sctp.transmitReconfig();
                }
            }
            else {
                this.dataChannelQueue = this.dataChannelQueue.filter((queueItem) => queueItem[0].id !== channel.id);
                if (channel.id) {
                    delete this.dataChannels[channel.id];
                }
                channel.setReadyState("closed");
            }
        }
    }
}
exports.RTCSctpTransport = RTCSctpTransport;
class RTCSctpCapabilities {
    constructor(maxMessageSize) {
        this.maxMessageSize = maxMessageSize;
    }
}
exports.RTCSctpCapabilities = RTCSctpCapabilities;
class BridgeDtls {
    constructor(dtls) {
        this.dtls = dtls;
        this.send = this.dtls.sendData;
    }
    set onData(onData) {
        this.dtls.dataReceiver = onData;
    }
    close() { }
}
//# sourceMappingURL=sctp.js.map