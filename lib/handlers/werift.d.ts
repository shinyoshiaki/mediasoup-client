import { RTCPeerConnection, RTCRtpCodecParameters, RTCRtpHeaderExtensionParameters } from "werift";
import { HandlerInterface, HandlerReceiveDataChannelOptions, HandlerReceiveDataChannelResult, HandlerReceiveOptions, HandlerReceiveResult, HandlerRunOptions, HandlerSendDataChannelOptions, HandlerSendDataChannelResult, HandlerSendOptions, HandlerSendResult } from "./HandlerInterface";
import { SctpCapabilities } from "../SctpParameters";
import { RtpCapabilities } from "../RtpParameters";
import { IceParameters } from "../Transport";
export declare class Werift extends HandlerInterface {
    nativeRtpCapabilities: {
        codecs: Partial<{
            audio: RTCRtpCodecParameters[];
            video: RTCRtpCodecParameters[];
        }>;
        headerExtensions: Partial<{
            audio: RTCRtpHeaderExtensionParameters[];
            video: RTCRtpHeaderExtensionParameters[];
        }>;
    };
    private _direction?;
    private _remoteSdp?;
    private _sendingRtpParametersByKind?;
    private _sendingRemoteRtpParametersByKind?;
    _pc: RTCPeerConnection;
    private readonly _mapMidTransceiver;
    private _hasDataChannelMediaSection;
    private _nextSendSctpStreamId;
    private _transportReady;
    static createFactory(nativeRtpCapabilities: {
        codecs: Partial<{
            audio: RTCRtpCodecParameters[];
            video: RTCRtpCodecParameters[];
        }>;
        headerExtensions: Partial<{
            audio: RTCRtpHeaderExtensionParameters[];
            video: RTCRtpHeaderExtensionParameters[];
        }>;
    }): () => Werift;
    constructor(nativeRtpCapabilities: {
        codecs: Partial<{
            audio: RTCRtpCodecParameters[];
            video: RTCRtpCodecParameters[];
        }>;
        headerExtensions: Partial<{
            audio: RTCRtpHeaderExtensionParameters[];
            video: RTCRtpHeaderExtensionParameters[];
        }>;
    });
    get name(): string;
    close(): void;
    getNativeRtpCapabilities(): Promise<RtpCapabilities>;
    getNativeSctpCapabilities(): Promise<SctpCapabilities>;
    run({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, proprietaryConstraints, extendedRtpCapabilities, }: HandlerRunOptions): void;
    updateIceServers(iceServers: RTCIceServer[]): Promise<void>;
    restartIce(iceParameters: IceParameters): Promise<void>;
    getTransportStats(): Promise<RTCStatsReport>;
    send({ track, encodings, codecOptions, codec, }: HandlerSendOptions): Promise<HandlerSendResult>;
    stopSending(localId: string): Promise<void>;
    replaceTrack(localId: string, track: globalThis.MediaStreamTrack | null): Promise<void>;
    setMaxSpatialLayer(localId: string, spatialLayer: number): Promise<void>;
    setRtpEncodingParameters(localId: string, params: any): Promise<void>;
    getSenderStats(localId: string): Promise<RTCStatsReport>;
    sendDataChannel({ ordered, maxPacketLifeTime, maxRetransmits, label, protocol, priority, }: HandlerSendDataChannelOptions): Promise<HandlerSendDataChannelResult>;
    receive({ trackId, kind, rtpParameters, }: HandlerReceiveOptions): Promise<HandlerReceiveResult>;
    stopReceiving(localId: string): Promise<void>;
    getReceiverStats(localId: string): Promise<RTCStatsReport>;
    receiveDataChannel({ sctpStreamParameters, label, protocol, }: HandlerReceiveDataChannelOptions): Promise<HandlerReceiveDataChannelResult>;
    private _setupTransport;
    private _assertSendDirection;
    private _assertRecvDirection;
}
