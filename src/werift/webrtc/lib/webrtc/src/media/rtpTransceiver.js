"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Directions = exports.RTCRtpTransceiver = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
const uuid = tslib_1.__importStar(require("uuid"));
const const_1 = require("../const");
const log = debug_1.default("werift:webrtc:rtpTransceiver");
class RTCRtpTransceiver {
    constructor(kind, receiver, sender, direction, dtlsTransport) {
        this.kind = kind;
        this.receiver = receiver;
        this.sender = sender;
        this.direction = direction;
        this.dtlsTransport = dtlsTransport;
        this.uuid = uuid.v4();
        this.onTrack = new rx_mini_1.default();
        this.usedForSender = false;
        this._codecs = [];
        this.headerExtensions = [];
        this.options = {};
        this.stopping = false;
        this.stopped = false;
    }
    set currentDirection(direction) {
        this._currentDirection = direction;
        if (const_1.SenderDirections.includes(this._currentDirection)) {
            this.usedForSender = true;
        }
    }
    get currentDirection() {
        // todo fix typescript 4.3
        return this._currentDirection;
    }
    get codecs() {
        return this._codecs;
    }
    set codecs(codecs) {
        this._codecs = codecs;
        this.receiver.codecs = codecs;
        this.sender.codec = codecs[0];
    }
    get msid() {
        return `${this.sender.streamId} ${this.sender.trackId}`;
    }
    addTrack(track) {
        const res = this.receiver.addTrack(track);
        if (res)
            this.onTrack.execute(track);
    }
    // todo impl
    // https://www.w3.org/TR/webrtc/#methods-8
    stop() {
        if (this.stopping)
            return;
        // todo Stop sending and receiving with transceiver.
        this.stopping = true;
    }
}
exports.RTCRtpTransceiver = RTCRtpTransceiver;
exports.Directions = [
    "inactive",
    "sendonly",
    "recvonly",
    "sendrecv",
];
//# sourceMappingURL=rtpTransceiver.js.map