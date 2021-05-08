export declare class RTCRtpParameters {
    codecs: RTCRtpCodecParameters[];
    headerExtensions: RTCRtpHeaderExtensionParameters[];
    muxId: string;
    rid?: string;
    rtcp: RTCRtcpParameters;
    constructor(props?: Partial<RTCRtpParameters>);
}
export declare class RTCRtpCodecCapability {
    mimeType: string;
    clockRate: number;
    channels?: number;
    parameters: {};
    constructor(parameters?: Partial<RTCRtpCodecCapability>);
    get name(): string;
}
export declare type RTCPFB = {
    type: string;
    parameter?: string;
};
export declare class RTCRtpCodecParameters {
    payloadType: number;
    mimeType: string;
    clockRate: number;
    channels?: number;
    rtcpFeedback: RTCPFB[];
    parameters: {};
    constructor(props: Pick<RTCRtpCodecParameters, "mimeType" | "clockRate"> & Partial<RTCRtpCodecParameters>);
    get name(): string;
    get str(): string;
}
export declare class RTCRtpHeaderExtensionParameters {
    id: number;
    uri: string;
    constructor(props?: Partial<RTCRtpHeaderExtensionParameters>);
}
export declare class RTCRtcpParameters {
    cname?: string;
    mux: boolean;
    ssrc?: number;
    constructor(props?: Partial<RTCRtcpParameters>);
}
export declare class RTCRtcpFeedback {
    type: string;
    parameter?: string;
    constructor(props?: Partial<RTCRtcpFeedback>);
}
export declare class RTCRtpRtxParameters {
    ssrc: number;
    constructor(props?: Partial<RTCRtpRtxParameters>);
}
export declare class RTCRtpCodingParameters {
    ssrc: number;
    payloadType: number;
    rtx?: RTCRtpRtxParameters;
    constructor(props: Partial<RTCRtpCodingParameters> & Pick<RTCRtpCodingParameters, "ssrc" | "payloadType">);
}
export declare class RTCRtpReceiveParameters extends RTCRtpParameters {
    encodings: RTCRtpCodingParameters[];
    constructor(props: Partial<RTCRtpReceiveParameters>);
}
export declare class RTCRtpSimulcastParameters {
    rid: string;
    direction: "send" | "recv";
    constructor(props: RTCRtpSimulcastParameters);
}
