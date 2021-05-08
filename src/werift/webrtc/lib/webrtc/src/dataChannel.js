"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTCDataChannelParameters = exports.RTCDataChannel = void 0;
const rx_mini_1 = require("rx.mini");
const helper_1 = require("./helper");
class RTCDataChannel extends helper_1.EventTarget {
    constructor(transport, parameters, sendOpen = true) {
        super();
        this.transport = transport;
        this.parameters = parameters;
        this.sendOpen = sendOpen;
        this.stateChanged = new rx_mini_1.Event();
        this.message = new rx_mini_1.Event();
        // todo impl
        this.error = new rx_mini_1.Event();
        this.bufferedAmountLow = new rx_mini_1.Event();
        this.onopen = () => { };
        this.onclose = () => { };
        this.onclosing = () => { };
        // todo impl
        this.onerror = () => { };
        this.isCreatedByRemote = false;
        this.id = this.parameters.id;
        this.readyState = "connecting";
        this.bufferedAmount = 0;
        this._bufferedAmountLowThreshold = 0;
        if (parameters.negotiated) {
            if (this.id == undefined || this.id < 0 || this.id > 65534) {
                throw new Error("ID must be in range 0-65534 if data channel is negotiated out-of-band");
            }
            this.transport.dataChannelAddNegotiated(this);
        }
        else {
            if (sendOpen) {
                this.sendOpen = false;
                this.transport.dataChannelOpen(this);
            }
        }
    }
    get ordered() {
        return this.parameters.ordered;
    }
    get maxRetransmits() {
        return this.parameters.maxRetransmits;
    }
    get maxPacketLifeTime() {
        return this.parameters.maxPacketLifeTime;
    }
    get label() {
        return this.parameters.label;
    }
    get protocol() {
        return this.parameters.protocol;
    }
    get negotiated() {
        return this.parameters.negotiated;
    }
    get bufferedAmountLowThreshold() {
        return this._bufferedAmountLowThreshold;
    }
    set bufferedAmountLowThreshold(value) {
        if (value < 0 || value > 4294967295)
            throw new Error("bufferedAmountLowThreshold must be in range 0 - 4294967295");
        this.bufferedAmountLowThreshold = value;
    }
    setId(id) {
        this.id = id;
    }
    setReadyState(state) {
        if (state !== this.readyState) {
            this.readyState = state;
            this.stateChanged.execute(state);
            switch (state) {
                case "open":
                    if (this.onopen)
                        this.onopen();
                    this.emit("open");
                    break;
                case "closed":
                    if (this.onclose)
                        this.onclose();
                    this.emit("close");
                    break;
                case "closing":
                    if (this.onclosing)
                        this.onclosing();
                    break;
            }
        }
    }
    addBufferedAmount(amount) {
        const crossesThreshold = this.bufferedAmount > this.bufferedAmountLowThreshold &&
            this.bufferedAmount + amount <= this.bufferedAmountLowThreshold;
        this.bufferedAmount += amount;
        if (crossesThreshold) {
            this.bufferedAmountLow.execute();
            this.emit("bufferedamountlow");
        }
    }
    send(data) {
        this.transport.datachannelSend(this, data);
    }
    close() {
        this.transport.dataChannelClose(this);
    }
}
exports.RTCDataChannel = RTCDataChannel;
class RTCDataChannelParameters {
    constructor(props = {}) {
        this.label = "";
        this.ordered = true;
        this.protocol = "";
        this.negotiated = false;
        Object.assign(this, props);
    }
}
exports.RTCDataChannelParameters = RTCDataChannelParameters;
//# sourceMappingURL=dataChannel.js.map