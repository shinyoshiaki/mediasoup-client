/// <reference types="node" />
import { FullIntraRequest } from "./fullIntraRequest";
import { PictureLossIndication } from "./pictureLossIndication";
import { RtcpHeader } from "../header";
import { ReceiverEstimatedMaxBitrate } from "./remb";
declare type Feedback = FullIntraRequest | PictureLossIndication | ReceiverEstimatedMaxBitrate;
export declare class RtcpPayloadSpecificFeedback {
    static type: number;
    type: number;
    feedback: Feedback;
    constructor(props?: Partial<RtcpPayloadSpecificFeedback>);
    serialize(): Buffer;
    static deSerialize(data: Buffer, header: RtcpHeader): RtcpPayloadSpecificFeedback;
}
export {};
