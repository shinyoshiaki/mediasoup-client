"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTCIceParameters = exports.RTCIceCandidate = exports.candidateToIce = exports.candidateFromIce = exports.RTCIceGatherer = exports.IceGathererStates = exports.IceTransportStates = exports.RTCIceTransport = void 0;
const tslib_1 = require("tslib");
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
const src_1 = require("../../../ice/src");
const sdp_1 = require("../sdp");
class RTCIceTransport {
    constructor(gather) {
        this.gather = gather;
        this.connection = this.gather.connection;
        this.state = "new";
        this.onStateChange = new rx_mini_1.default();
        this.addRemoteCandidate = async (candidate) => {
            if (!this.connection.remoteCandidatesEnd) {
                if (!candidate) {
                    await this.connection.addRemoteCandidate(undefined);
                }
                else {
                    await this.connection.addRemoteCandidate(candidateToIce(candidate));
                }
            }
        };
        this.connection.stateChanged.subscribe((state) => {
            this.setState(state);
        });
    }
    get iceGather() {
        return this.gather;
    }
    get role() {
        if (this.connection.iceControlling)
            return "controlling";
        else
            return "controlled";
    }
    setState(state) {
        if (state !== this.state) {
            this.state = state;
            if (this.onStateChange.ended)
                return;
            if (state === "closed") {
                this.onStateChange.execute(state);
                this.onStateChange.complete();
            }
            else {
                this.onStateChange.execute(state);
            }
        }
    }
    async start(remoteParameters) {
        if (this.state === "closed")
            throw new Error("RTCIceTransport is closed");
        if (this.waitStart)
            await this.waitStart.asPromise();
        this.waitStart = new rx_mini_1.default();
        this.setState("checking");
        this.connection.remoteIsLite = remoteParameters.iceLite;
        this.connection.remoteUsername = remoteParameters.usernameFragment;
        this.connection.remotePassword = remoteParameters.password;
        try {
            await this.connection.connect();
            this.setState("completed");
        }
        catch (error) {
            this.setState("failed");
            throw new Error(error);
        }
        this.waitStart.complete();
    }
    async stop() {
        if (this.state !== "closed") {
            this.setState("closed");
            await this.connection.close();
        }
    }
}
exports.RTCIceTransport = RTCIceTransport;
exports.IceTransportStates = [
    "new",
    "checking",
    "connected",
    "completed",
    "disconnected",
    "failed",
    "closed",
];
exports.IceGathererStates = ["new", "gathering", "complete"];
class RTCIceGatherer {
    constructor(options = {}) {
        this.options = options;
        this.onIceCandidate = () => { };
        this.gatheringState = "new";
        this.onGatheringStateChange = new rx_mini_1.default();
        this.connection = new src_1.Connection(false, this.options);
    }
    async gather() {
        if (this.gatheringState === "new") {
            this.setState("gathering");
            await this.connection.gatherCandidates((candidate) => this.onIceCandidate(candidateFromIce(candidate)));
            this.setState("complete");
        }
    }
    get localCandidates() {
        return this.connection.localCandidates.map(candidateFromIce);
    }
    get localParameters() {
        const params = new RTCIceParameters({
            usernameFragment: this.connection.localUserName,
            password: this.connection.localPassword,
        });
        return params;
    }
    setState(state) {
        if (state !== this.gatheringState) {
            this.gatheringState = state;
            this.onGatheringStateChange.execute(state);
        }
    }
}
exports.RTCIceGatherer = RTCIceGatherer;
function candidateFromIce(c) {
    const candidate = new RTCIceCandidate(c.component, c.foundation, c.host, c.port, c.priority, c.transport, c.type);
    candidate.relatedAddress = c.relatedAddress;
    candidate.relatedPort = c.relatedPort;
    candidate.tcpType = c.tcptype;
    return candidate;
}
exports.candidateFromIce = candidateFromIce;
function candidateToIce(x) {
    return new src_1.Candidate(x.foundation, x.component, x.protocol, x.priority, x.ip, x.port, x.type, x.relatedAddress, x.relatedPort, x.tcpType);
}
exports.candidateToIce = candidateToIce;
class RTCIceCandidate {
    constructor(component, foundation, ip, port, priority, protocol, type) {
        this.component = component;
        this.foundation = foundation;
        this.ip = ip;
        this.port = port;
        this.priority = priority;
        this.protocol = protocol;
        this.type = type;
    }
    toJSON() {
        return {
            candidate: sdp_1.candidateToSdp(this),
            sdpMLineIndex: this.sdpMLineIndex,
            sdpMid: this.sdpMid,
        };
    }
    static fromJSON(data) {
        try {
            const candidate = sdp_1.candidateFromSdp(data.candidate);
            candidate.sdpMLineIndex = data.sdpMLineIndex;
            candidate.sdpMid = data.sdpMid;
            return candidate;
        }
        catch (error) { }
    }
}
exports.RTCIceCandidate = RTCIceCandidate;
class RTCIceParameters {
    constructor(props = {}) {
        this.iceLite = false;
        Object.assign(this, props);
    }
}
exports.RTCIceParameters = RTCIceParameters;
//# sourceMappingURL=ice.js.map