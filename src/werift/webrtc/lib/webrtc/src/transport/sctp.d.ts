/// <reference types="node" />
import { Event } from "rx.mini";
import { SCTP } from "../../../sctp/src";
import { RTCDataChannel } from "../dataChannel";
import { RTCDtlsTransport } from "./dtls";
export declare class RTCSctpTransport {
    dtlsTransport: RTCDtlsTransport;
    port: number;
    readonly onDataChannel: Event<[RTCDataChannel]>;
    readonly uuid: string;
    readonly sctp: SCTP;
    mid?: string;
    bundled: boolean;
    dataChannels: {
        [key: number]: RTCDataChannel;
    };
    private dataChannelQueue;
    private dataChannelId?;
    constructor(dtlsTransport: RTCDtlsTransport, port?: number);
    private get isServer();
    channelByLabel(label: string): RTCDataChannel | undefined;
    private datachannelReceive;
    dataChannelAddNegotiated(channel: RTCDataChannel): void;
    dataChannelOpen(channel: RTCDataChannel): void;
    private dataChannelFlush;
    datachannelSend: (channel: RTCDataChannel, data: Buffer | string) => void;
    static getCapabilities(): RTCSctpCapabilities;
    start(remotePort: number): Promise<void>;
    stop(): Promise<void>;
    dataChannelClose(channel: RTCDataChannel): void;
}
export declare class RTCSctpCapabilities {
    maxMessageSize: number;
    constructor(maxMessageSize: number);
}
