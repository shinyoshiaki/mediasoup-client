"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidatePriority = exports.candidateFoundation = exports.Candidate = void 0;
const lodash_1 = require("lodash");
const net_1 = require("net");
const crypto_1 = require("crypto");
class Candidate {
    // An ICE candidate.
    constructor(foundation, component, transport, priority, host, port, type, relatedAddress, relatedPort, tcptype, generation) {
        this.foundation = foundation;
        this.component = component;
        this.transport = transport;
        this.priority = priority;
        this.host = host;
        this.port = port;
        this.type = type;
        this.relatedAddress = relatedAddress;
        this.relatedPort = relatedPort;
        this.tcptype = tcptype;
        this.generation = generation;
    }
    static fromSdp(sdp) {
        // Parse a :class:`Candidate` from SDP.
        // .. code-block:: python
        //    Candidate.from_sdp(
        //     '6815297761 1 udp 659136 1.2.3.4 31102 typ host generation 0')
        const bits = sdp.split(" ");
        if (bits.length < 8)
            throw new Error("SDP does not have enough properties");
        const kwargs = {
            foundation: bits[0],
            component: Number(bits[1]),
            transport: bits[2],
            priority: Number(bits[3]),
            host: bits[4],
            port: Number(bits[5]),
            type: bits[7],
        };
        for (const i of lodash_1.range(8, bits.length - 1, 2)) {
            if (bits[i] === "raddr") {
                kwargs["related_address"] = bits[i + 1];
            }
            else if (bits[i] === "rport") {
                kwargs["related_port"] = Number(bits[i + 1]);
            }
            else if (bits[i] === "tcptype") {
                kwargs["tcptype"] = bits[i + 1];
            }
            else if (bits[i] === "generation") {
                kwargs["generation"] = Number(bits[i + 1]);
            }
        }
        const { foundation, component, transport, priority, host, port, type, } = kwargs;
        return new Candidate(foundation, component, transport, priority, host, port, type, kwargs["related_address"], kwargs["related_port"], kwargs["tcptype"], kwargs["generation"]);
    }
    canPairWith(other) {
        // """
        // A local candidate is paired with a remote candidate if and only if
        // the two candidates have the same component ID and have the same IP
        // address version.
        // """
        const a = net_1.isIPv4(this.host);
        const b = net_1.isIPv4(other.host);
        return (this.component === other.component &&
            this.transport.toLowerCase() === other.transport.toLowerCase() &&
            a === b);
    }
    toSdp() {
        let sdp = `${this.foundation} ${this.component} ${this.transport} ${this.priority} ${this.host} ${this.port} typ ${this.type}`;
        if (this.relatedAddress)
            sdp += ` raddr ${this.relatedAddress}`;
        if (this.relatedPort != undefined)
            sdp += ` rport ${this.relatedPort}`;
        if (this.tcptype)
            sdp += ` tcptype ${this.tcptype}`;
        if (this.generation != undefined)
            sdp += ` generation ${this.generation}`;
        return sdp;
    }
}
exports.Candidate = Candidate;
function candidateFoundation(candidateType, candidateTransport, baseAddress) {
    // """
    // See RFC 5245 - 4.1.1.3. Computing Foundations
    // """
    const key = `${candidateType}|${candidateTransport}|${baseAddress}`;
    return crypto_1.createHash("md5").update(key, "ascii").digest("hex").slice(7);
}
exports.candidateFoundation = candidateFoundation;
// priorityを決める
function candidatePriority(candidateComponent, candidateType, localPref = 65535) {
    // See RFC 5245 - 4.1.2.1. Recommended Formula
    let typePref = 0;
    if (candidateType === "host") {
        typePref = 126;
    }
    else if (candidateType === "prflx") {
        typePref = 110;
    }
    else if (candidateType === "srflx") {
        typePref = 100;
    }
    else {
        typePref = 0;
    }
    return ((1 << 24) * typePref + (1 << 8) * localPref + (256 - candidateComponent));
}
exports.candidatePriority = candidatePriority;
//# sourceMappingURL=candidate.js.map