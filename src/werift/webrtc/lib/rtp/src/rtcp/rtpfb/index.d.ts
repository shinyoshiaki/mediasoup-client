/// <reference types="node" />
import { RtcpHeader } from "../header";
import { GenericNack } from "./nack";
import { TransportWideCC } from "./twcc";
declare type Feedback = GenericNack | TransportWideCC;
export declare class RtcpTransportLayerFeedback {
    static type: number;
    type: number;
    feedback: Feedback;
    header: RtcpHeader;
    constructor(props?: Partial<RtcpTransportLayerFeedback>);
    serialize(): Buffer;
    static deSerialize(data: Buffer, header: RtcpHeader): RtcpTransportLayerFeedback;
}
export {};
