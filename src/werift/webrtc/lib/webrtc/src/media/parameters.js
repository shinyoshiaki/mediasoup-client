"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTCRtpSimulcastParameters = exports.RTCRtpReceiveParameters = exports.RTCRtpCodingParameters = exports.RTCRtpRtxParameters = exports.RTCRtcpFeedback = exports.RTCRtcpParameters = exports.RTCRtpHeaderExtensionParameters = exports.RTCRtpCodecParameters = exports.RTCRtpCodecCapability = exports.RTCRtpParameters = void 0;
class RTCRtpParameters {
    constructor(props = {}) {
        this.codecs = [];
        this.headerExtensions = [];
        Object.assign(this, props);
    }
}
exports.RTCRtpParameters = RTCRtpParameters;
class RTCRtpCodecCapability {
    constructor(parameters = {}) {
        this.parameters = {};
        Object.assign(this, parameters);
    }
    get name() {
        return this.mimeType.split("/")[1];
    }
}
exports.RTCRtpCodecCapability = RTCRtpCodecCapability;
class RTCRtpCodecParameters {
    constructor(props) {
        this.rtcpFeedback = [];
        this.parameters = {};
        Object.assign(this, props);
    }
    get name() {
        return this.mimeType.split("/")[1];
    }
    get str() {
        let s = `${this.name}/${this.clockRate}`;
        if (this.channels === 2)
            s += "/2";
        return s;
    }
}
exports.RTCRtpCodecParameters = RTCRtpCodecParameters;
class RTCRtpHeaderExtensionParameters {
    constructor(props = {}) {
        Object.assign(this, props);
    }
}
exports.RTCRtpHeaderExtensionParameters = RTCRtpHeaderExtensionParameters;
class RTCRtcpParameters {
    constructor(props = {}) {
        this.mux = false;
        Object.assign(this, props);
    }
}
exports.RTCRtcpParameters = RTCRtcpParameters;
class RTCRtcpFeedback {
    constructor(props = {}) {
        Object.assign(this, props);
    }
}
exports.RTCRtcpFeedback = RTCRtcpFeedback;
class RTCRtpRtxParameters {
    constructor(props = {}) {
        Object.assign(this, props);
    }
}
exports.RTCRtpRtxParameters = RTCRtpRtxParameters;
class RTCRtpCodingParameters {
    constructor(props) {
        Object.assign(this, props);
    }
}
exports.RTCRtpCodingParameters = RTCRtpCodingParameters;
class RTCRtpReceiveParameters extends RTCRtpParameters {
    constructor(props) {
        super(props);
        this.encodings = [];
        Object.assign(this, props);
    }
}
exports.RTCRtpReceiveParameters = RTCRtpReceiveParameters;
class RTCRtpSimulcastParameters {
    constructor(props) {
        Object.assign(this, props);
    }
}
exports.RTCRtpSimulcastParameters = RTCRtpSimulcastParameters;
//# sourceMappingURL=parameters.js.map