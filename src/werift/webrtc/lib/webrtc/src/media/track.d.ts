/// <reference types="node" />
import Event from "rx.mini";
import { RtpHeader, RtpPacket } from "../../../rtp/src";
import { EventTarget } from "../helper";
import { Kind } from "../types/domain";
import { RTCRtpCodecParameters } from "./parameters";
export declare class MediaStreamTrack extends EventTarget {
    remote: boolean;
    label: string;
    id: string;
    kind: Kind;
    ssrc?: number;
    rid?: string;
    header?: RtpHeader;
    codec?: RTCRtpCodecParameters;
    readonly onReceiveRtp: Event<[RtpPacket]>;
    stopped: boolean;
    muted: boolean;
    constructor(props: Partial<MediaStreamTrack> & Pick<MediaStreamTrack, "kind">);
    stop: () => void;
    writeRtp: (rtp: RtpPacket | Buffer) => void;
}
