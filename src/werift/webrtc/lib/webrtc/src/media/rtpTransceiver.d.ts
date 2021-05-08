import Event from "rx.mini";
import { RTCDtlsTransport } from "../transport/dtls";
import { Kind } from "../types/domain";
import { RTCRtpCodecParameters, RTCRtpHeaderExtensionParameters } from "./parameters";
import { RTCRtpReceiver } from "./rtpReceiver";
import { RTCRtpSender } from "./rtpSender";
import { MediaStreamTrack } from "./track";
export declare class RTCRtpTransceiver {
    readonly kind: Kind;
    readonly receiver: RTCRtpReceiver;
    readonly sender: RTCRtpSender;
    direction: Direction;
    dtlsTransport: RTCDtlsTransport;
    readonly uuid: string;
    readonly onTrack: Event<[MediaStreamTrack]>;
    mid?: string;
    mLineIndex?: number;
    usedForSender: boolean;
    private _currentDirection?;
    set currentDirection(direction: Direction);
    get currentDirection(): Direction;
    offerDirection: Direction;
    private _codecs;
    get codecs(): RTCRtpCodecParameters[];
    set codecs(codecs: RTCRtpCodecParameters[]);
    headerExtensions: RTCRtpHeaderExtensionParameters[];
    options: Partial<TransceiverOptions>;
    stopping: boolean;
    stopped: boolean;
    constructor(kind: Kind, receiver: RTCRtpReceiver, sender: RTCRtpSender, direction: Direction, dtlsTransport: RTCDtlsTransport);
    get msid(): string;
    addTrack(track: MediaStreamTrack): void;
    stop(): void;
}
export declare const Directions: readonly ["inactive", "sendonly", "recvonly", "sendrecv"];
export declare type Direction = typeof Directions[number];
declare type SimulcastDirection = "send" | "recv";
export interface TransceiverOptions {
    direction: Direction;
    simulcast: {
        direction: SimulcastDirection;
        rid: string;
    }[];
}
export {};
