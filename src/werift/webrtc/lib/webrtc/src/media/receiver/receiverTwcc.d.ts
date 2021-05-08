import { RTCDtlsTransport } from "../../transport/dtls";
declare type ExtensionInfo = {
    tsn: number;
    timestamp: number;
};
export declare class ReceiverTWCC {
    private dtlsTransport;
    private rtcpSsrc;
    private mediaSourceSsrc;
    extensionInfo: {
        [tsn: number]: ExtensionInfo;
    };
    twccRunning: boolean;
    /** uint8 */
    fbPktCount: number;
    lastTimestamp?: number;
    constructor(dtlsTransport: RTCDtlsTransport, rtcpSsrc: number, mediaSourceSsrc: number);
    handleTWCC(transportSequenceNumber: number): void;
    private runTWCC;
    private sendTWCC;
}
export {};
