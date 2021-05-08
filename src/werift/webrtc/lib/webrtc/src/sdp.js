"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsrcDescription = exports.addSDPHeader = exports.RTCSessionDescription = exports.candidateFromSdp = exports.candidateToSdp = exports.GroupDescription = exports.MediaDescription = exports.SessionDescription = void 0;
const crypto_1 = require("crypto");
const int64_buffer_1 = require("int64-buffer");
const lodash_1 = require("lodash");
const net_1 = require("net");
const helper_1 = require("./helper");
const const_1 = require("./const");
const parameters_1 = require("./media/parameters");
const dtls_1 = require("./transport/dtls");
const ice_1 = require("./transport/ice");
const sctp_1 = require("./transport/sctp");
class SessionDescription {
    constructor() {
        this.version = 0;
        this.name = "-";
        this.time = "0 0";
        this.group = [];
        this.msidSemantic = [];
        this.media = [];
        this.dtlsFingerprints = [];
    }
    static parse(sdp) {
        const [sessionLines, mediaGroups] = groupLines(sdp);
        const session = new SessionDescription();
        sessionLines.forEach((line) => {
            if (line.startsWith("v=")) {
                session.version = parseInt(line.slice(2), 10);
            }
            else if (line.startsWith("o=")) {
                session.origin = line.slice(2);
            }
            else if (line.startsWith("s=")) {
                session.name = line.slice(2);
            }
            else if (line.startsWith("c=")) {
                session.host = ipAddressFromSdp(line.slice(2));
            }
            else if (line.startsWith("t=")) {
                session.time = line.slice(2);
            }
            else if (line.startsWith("a=")) {
                const [attr, value] = parseAttr(line);
                switch (attr) {
                    case "fingerprint":
                        const [algorithm, fingerprint] = value?.split(" ") || [];
                        session.dtlsFingerprints.push(new dtls_1.RTCDtlsFingerprint(algorithm, fingerprint));
                        break;
                    case "ice-lite":
                        session.iceLite = true;
                        break;
                    case "ice-options":
                        session.iceOptions = value;
                        break;
                    case "ice-pwd":
                        session.icePassword = value;
                        break;
                    case "ice-ufrag":
                        session.iceUsernameFragment = value;
                        break;
                    case "group":
                        parseGroup(session.group, value);
                        break;
                    case "msid-semantic":
                        parseGroup(session.msidSemantic, value);
                        break;
                    case "setup":
                        session.dtlsRole = const_1.DTLS_SETUP_ROLE[value];
                        break;
                }
            }
        });
        mediaGroups.forEach((mediaLines) => {
            const target = mediaLines[0];
            const m = target.match(/^m=([^ ]+) ([0-9]+) ([A-Z/]+) (.+)/);
            if (!m) {
                throw new Error("m line not found");
            }
            const kind = m[1];
            const fmt = m[4].split(" ");
            // todo fix
            const fmtInt = ["audio", "video"].includes(kind)
                ? fmt.map((v) => Number(v))
                : undefined;
            const currentMedia = new MediaDescription(kind, parseInt(m[2]), m[3], fmtInt || fmt);
            currentMedia.dtlsParams = new dtls_1.RTCDtlsParameters([...session.dtlsFingerprints], session.dtlsRole);
            currentMedia.iceParams = new ice_1.RTCIceParameters({
                iceLite: session.iceLite,
                usernameFragment: session.iceUsernameFragment,
                password: session.icePassword,
            });
            currentMedia.iceOptions = session.iceOptions;
            session.media.push(currentMedia);
            mediaLines.slice(1).forEach((line) => {
                if (line.startsWith("c=")) {
                    currentMedia.host = ipAddressFromSdp(line.slice(2));
                }
                else if (line.startsWith("a=")) {
                    const [attr, value] = parseAttr(line);
                    switch (attr) {
                        case "candidate":
                            if (!value)
                                throw new Error();
                            currentMedia.iceCandidates.push(candidateFromSdp(value));
                            break;
                        case "end-of-candidates":
                            currentMedia.iceCandidatesComplete = true;
                            break;
                        case "extmap":
                            // eslint-disable-next-line prefer-const
                            let [extId, extUri] = value.split(" ");
                            if (extId.includes("/")) {
                                [extId] = extId.split("/");
                            }
                            currentMedia.rtp.headerExtensions.push(new parameters_1.RTCRtpHeaderExtensionParameters({
                                id: parseInt(extId),
                                uri: extUri,
                            }));
                            break;
                        case "fingerprint":
                            if (!value)
                                throw new Error();
                            const [algorithm, fingerprint] = value.split(" ");
                            currentMedia.dtlsParams?.fingerprints.push(new dtls_1.RTCDtlsFingerprint(algorithm, fingerprint));
                            break;
                        case "ice-options":
                            currentMedia.iceOptions = value;
                            break;
                        case "ice-pwd":
                            currentMedia.iceParams.password = value;
                            break;
                        case "ice-ufrag":
                            currentMedia.iceParams.usernameFragment = value;
                            break;
                        case "max-message-size":
                            currentMedia.sctpCapabilities = new sctp_1.RTCSctpCapabilities(parseInt(value, 10));
                            break;
                        case "mid":
                            currentMedia.rtp.muxId = value;
                            break;
                        case "msid":
                            currentMedia.msid = value;
                            break;
                        case "rtcp":
                            const [port, rest] = helper_1.divide(value, " ");
                            currentMedia.rtcpPort = parseInt(port);
                            currentMedia.rtcpHost = ipAddressFromSdp(rest);
                            break;
                        case "rtcp-mux":
                            currentMedia.rtcpMux = true;
                            break;
                        case "setup":
                            currentMedia.dtlsParams.role = const_1.DTLS_SETUP_ROLE[value];
                            break;
                        case "recvonly":
                        case "sendonly":
                        case "sendrecv":
                        case "inactive":
                            currentMedia.direction = attr;
                            break;
                        case "rtpmap":
                            {
                                const [formatId, formatDesc] = helper_1.divide(value, " ");
                                const [type, clock, channel] = formatDesc.split("/");
                                let channels;
                                if (currentMedia.kind === "audio") {
                                    channels = channel ? parseInt(channel) : 1;
                                }
                                const codec = new parameters_1.RTCRtpCodecParameters({
                                    mimeType: currentMedia.kind + "/" + type,
                                    channels,
                                    clockRate: parseInt(clock),
                                    payloadType: parseInt(formatId),
                                });
                                currentMedia.rtp.codecs.push(codec);
                            }
                            break;
                        case "sctpmap":
                            if (!value)
                                throw new Error();
                            const [formatId, formatDesc] = helper_1.divide(value, " ");
                            currentMedia[attr][parseInt(formatId)] = formatDesc;
                            break;
                        case "sctp-port":
                            if (!value)
                                throw new Error();
                            currentMedia.sctpPort = parseInt(value);
                            break;
                        case "ssrc":
                            const [ssrcStr, ssrcDesc] = helper_1.divide(value, " ");
                            const ssrc = parseInt(ssrcStr);
                            const [ssrcAttr, ssrcValue] = helper_1.divide(ssrcDesc, ":");
                            let ssrcInfo = currentMedia.ssrc.find((v) => v.ssrc === ssrc);
                            if (!ssrcInfo) {
                                ssrcInfo = new SsrcDescription({ ssrc });
                                currentMedia.ssrc.push(ssrcInfo);
                            }
                            if (const_1.SSRC_INFO_ATTRS.includes(ssrcAttr)) {
                                ssrcInfo[ssrcAttr] = ssrcValue;
                            }
                            break;
                        case "rid":
                            {
                                const [rid, direction] = helper_1.divide(value, " ");
                                currentMedia.simulcastParameters.push(new parameters_1.RTCRtpSimulcastParameters({
                                    rid,
                                    direction: direction,
                                }));
                            }
                            break;
                    }
                }
            });
            if (!currentMedia.dtlsParams.role) {
                currentMedia.dtlsParams = undefined;
            }
            const findCodec = (pt) => currentMedia.rtp.codecs.find((v) => v.payloadType === pt);
            mediaLines.slice(1).forEach((line) => {
                if (line.startsWith("a=")) {
                    const [attr, value] = parseAttr(line);
                    if (attr === "fmtp") {
                        const [formatId, formatDesc] = helper_1.divide(value, " ");
                        const codec = findCodec(Number(formatId));
                        codec.parameters = parametersFromSdp(formatDesc);
                    }
                    else if (attr === "rtcp-fb") {
                        const [payloadType, feedbackType, feedbackParam] = value.split(" ");
                        currentMedia.rtp.codecs.forEach((codec) => {
                            if (["*", codec.payloadType.toString()].includes(payloadType)) {
                                codec.rtcpFeedback.push(new parameters_1.RTCRtcpFeedback({
                                    type: feedbackType,
                                    parameter: feedbackParam,
                                }));
                            }
                        });
                    }
                }
            });
        });
        return session;
    }
    webrtcTrackId(media) {
        if (media.msid && media.msid.includes(" ")) {
            const bits = media.msid.split(" ");
            for (const group of this.msidSemantic) {
                if (group.semantic === "WMS" &&
                    (group.items.includes(bits[0]) || group.items.includes("*"))) {
                    return bits[1];
                }
            }
        }
        return;
    }
    toString() {
        const lines = [`v=${this.version}`, `o=${this.origin}`, `s=${this.name}`];
        if (this.host) {
            lines.push(`c=${ipAddressFromSdp(this.host)}`);
        }
        lines.push(`t=${this.time}`);
        this.group.forEach((group) => lines.push(`a=group:${group.str()}`));
        this.msidSemantic.forEach((group) => lines.push(`a=msid-semantic:${group.str()}`));
        const media = this.media.map((m) => m.toString()).join("");
        const sdp = lines.join("\r\n") + "\r\n" + media;
        return sdp;
    }
    toJSON() {
        return new RTCSessionDescription(this.toString(), this.type);
    }
}
exports.SessionDescription = SessionDescription;
class MediaDescription {
    constructor(kind, port, profile, fmt) {
        this.kind = kind;
        this.port = port;
        this.profile = profile;
        this.fmt = fmt;
        this.rtcpMux = false;
        // ssrc
        this.ssrc = [];
        this.ssrcGroup = [];
        // formats
        this.rtp = new parameters_1.RTCRtpParameters();
        this.sctpMap = {};
        this.iceCandidates = [];
        this.iceCandidatesComplete = false;
        // Simulcast
        this.simulcastParameters = [];
    }
    toString() {
        const lines = [];
        lines.push(`m=${this.kind} ${this.port} ${this.profile} ${this.fmt
            .map((v) => v.toString())
            .join(" ")}`);
        if (this.host) {
            lines.push(`c=${ipAddressToSdp(this.host)}`);
        }
        // ice
        this.iceCandidates.forEach((candidate) => {
            lines.push(`a=candidate:${candidateToSdp(candidate)}`);
        });
        if (this.iceCandidatesComplete) {
            lines.push("a=end-of-candidates");
        }
        if (this.iceParams?.usernameFragment) {
            lines.push(`a=ice-ufrag:${this.iceParams.usernameFragment}`);
        }
        if (this.iceParams?.password) {
            lines.push(`a=ice-pwd:${this.iceParams.password}`);
        }
        if (this.iceOptions) {
            lines.push(`a=ice-options:${this.iceOptions}`);
        }
        // dtls
        if (this.dtlsParams) {
            this.dtlsParams.fingerprints.forEach((fingerprint) => {
                lines.push(`a=fingerprint:${fingerprint.algorithm} ${fingerprint.value}`);
            });
            lines.push(`a=setup:${const_1.DTLS_ROLE_SETUP[this.dtlsParams.role]}`);
        }
        if (this.direction) {
            lines.push(`a=${this.direction}`);
        }
        if (this.rtp.muxId) {
            lines.push(`a=mid:${this.rtp.muxId}`);
        }
        if (this.msid) {
            lines.push(`a=msid:${this.msid}`);
        }
        if (this.rtcpPort && this.rtcpHost) {
            lines.push(`a=rtcp:${this.rtcpPort} ${ipAddressToSdp(this.rtcpHost)}`);
            if (this.rtcpMux) {
                lines.push("a=rtcp-mux");
            }
        }
        this.ssrcGroup.forEach((group) => {
            lines.push(`a=ssrc-group:${group}`);
        });
        this.ssrc.forEach((ssrcInfo) => {
            const_1.SSRC_INFO_ATTRS.forEach((ssrcAttr) => {
                const ssrcValue = ssrcInfo[ssrcAttr];
                if (ssrcValue !== undefined) {
                    lines.push(`a=ssrc:${ssrcInfo.ssrc} ${ssrcAttr}:${ssrcValue}`);
                }
            });
        });
        this.rtp.codecs.forEach((codec) => {
            lines.push(`a=rtpmap:${codec.payloadType} ${codec.str}`);
            codec.rtcpFeedback.forEach((feedback) => {
                let value = feedback.type;
                if (feedback.parameter)
                    value += ` ${feedback.parameter}`;
                lines.push(`a=rtcp-fb:${codec.payloadType} ${value}`);
            });
            const params = parametersToSDP(codec.parameters);
            if (params) {
                lines.push(`a=fmtp:${codec.payloadType} ${params}`);
            }
        });
        Object.keys(this.sctpMap).forEach((k) => {
            const v = this.sctpMap[Number(k)];
            lines.push(`a=sctpmap:${k} ${v}`);
        });
        if (this.sctpPort) {
            lines.push(`a=sctp-port:${this.sctpPort}`);
        }
        if (this.sctpCapabilities) {
            lines.push(`a=max-message-size:${this.sctpCapabilities.maxMessageSize}`);
        }
        // rtp extension
        this.rtp.headerExtensions.forEach((extension) => lines.push(`a=extmap:${extension.id} ${extension.uri}`));
        // simulcast
        if (this.simulcastParameters.length) {
            this.simulcastParameters.forEach((param) => {
                lines.push(`a=rid:${param.rid} ${param.direction}`);
            });
            let line = `a=simulcast:`;
            const recv = this.simulcastParameters.filter((v) => v.direction === "recv");
            if (recv.length) {
                line += `recv ${recv.map((v) => v.rid).join(";")} `;
            }
            const send = this.simulcastParameters.filter((v) => v.direction === "send");
            if (send.length) {
                line += `send ${send.map((v) => v.rid).join(";")}`;
            }
            lines.push(line);
        }
        return lines.join("\r\n") + "\r\n";
    }
}
exports.MediaDescription = MediaDescription;
class GroupDescription {
    constructor(semantic, items) {
        this.semantic = semantic;
        this.items = items;
    }
    str() {
        return `${this.semantic} ${this.items.join(" ")}`;
    }
}
exports.GroupDescription = GroupDescription;
function ipAddressFromSdp(sdp) {
    const m = sdp.match(/^IN (IP4|IP6) ([^ ]+)$/);
    if (!m)
        throw new Error("exception");
    return m[2];
}
function ipAddressToSdp(addr) {
    const version = net_1.isIPv4(addr) ? 4 : 6;
    return `IN IP${version} ${addr}`;
}
function candidateToSdp(c) {
    let sdp = `${c.foundation} ${c.component} ${c.protocol} ${c.priority} ${c.ip} ${c.port} typ ${c.type}`;
    if (c.relatedAddress) {
        sdp += ` raddr ${c.relatedAddress}`;
    }
    if (c.relatedPort) {
        sdp += ` rport ${c.relatedPort}`;
    }
    if (c.tcpType) {
        sdp += ` tcptype ${c.tcpType}`;
    }
    return sdp;
}
exports.candidateToSdp = candidateToSdp;
function groupLines(sdp) {
    const session = [];
    const media = [];
    sdp.split("\r\n").forEach((line) => {
        if (line.startsWith("m=")) {
            media.push([line]);
        }
        else if (media.length > 0) {
            media[media.length - 1].push(line);
        }
        else {
            session.push(line);
        }
    });
    return [session, media];
}
function parseAttr(line) {
    if (line.includes(":")) {
        const bits = helper_1.divide(line.slice(2), ":");
        return [bits[0], bits[1]];
    }
    else {
        return [line.slice(2), undefined];
    }
}
function parseGroup(dest, value, type = (v) => v.toString()) {
    const bits = value.split(" ");
    if (bits.length > 0) {
        dest.push(new GroupDescription(bits[0], bits.slice(1).map(type)));
    }
}
function candidateFromSdp(sdp) {
    const bits = sdp.split(" ");
    if (bits.length < 8) {
        throw new Error();
    }
    const candidate = new ice_1.RTCIceCandidate(parseInt(bits[1], 10), bits[0], bits[4], parseInt(bits[5], 10), parseInt(bits[3], 10), bits[2], bits[7]);
    lodash_1.range(8, bits.length - 1, 2).forEach((i) => {
        switch (bits[i]) {
            case "raddr":
                candidate.relatedAddress = bits[i + 1];
                break;
            case "rport":
                candidate.relatedPort = parseInt(bits[i + 1]);
                break;
            case "tcptype":
                candidate.tcpType = bits[i + 1];
                break;
        }
    });
    return candidate;
}
exports.candidateFromSdp = candidateFromSdp;
class RTCSessionDescription {
    constructor(sdp, type) {
        this.sdp = sdp;
        this.type = type;
    }
}
exports.RTCSessionDescription = RTCSessionDescription;
function addSDPHeader(type, description) {
    const username = "-";
    const sessionId = new int64_buffer_1.Uint64BE(crypto_1.randomBytes(64)).toString().slice(0, 8);
    const sessionVersion = 0;
    description.origin = `${username} ${sessionId} ${sessionVersion} IN IP4 0.0.0.0`;
    description.msidSemantic.push(new GroupDescription("WMS", ["*"]));
    description.type = type;
}
exports.addSDPHeader = addSDPHeader;
function parametersFromSdp(sdp) {
    const parameters = {};
    sdp.split(";").forEach((param) => {
        if (param.includes("=")) {
            const [k, v] = helper_1.divide(param, "=");
            if (const_1.FMTP_INT_PARAMETERS.includes(k)) {
                parameters[k] = Number(v);
            }
            else {
                parameters[k] = v;
            }
        }
        else {
            parameters[param] = undefined;
        }
    });
    return parameters;
}
function parametersToSDP(parameters) {
    const params = Object.entries(parameters).map(([k, v]) => {
        if (v)
            return `${k}=${v}`;
        else
            return k;
    });
    if (params.length > 0) {
        return params.join(";") + ";";
    }
    return undefined;
}
class SsrcDescription {
    constructor(props) {
        Object.assign(this, props);
    }
}
exports.SsrcDescription = SsrcDescription;
//# sourceMappingURL=sdp.js.map