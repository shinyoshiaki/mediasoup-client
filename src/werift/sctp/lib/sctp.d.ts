/// <reference types="node" />
import { Event } from "rx.mini";
import { Chunk, DataChunk, ForwardTsnChunk } from "./chunk";
import { SCTP_STATE } from "./const";
import { Unpacked } from "./helper";
import { OutgoingSSNResetRequestParam, StreamParam } from "./param";
import { Transport } from "./transport";
declare const SCTPConnectionStates: readonly ["new", "closed", "connected", "connecting"];
declare type SCTPConnectionState = Unpacked<typeof SCTPConnectionStates>;
export declare class SCTP {
    transport: Transport;
    port: number;
    readonly stateChanged: {
        [key in SCTPConnectionState]: Event<[]>;
    };
    readonly onReconfigStreams: Event<[number[]]>;
    /**streamId: number, ppId: number, data: Buffer */
    readonly onReceive: Event<[number, number, Buffer]>;
    onSackReceived: () => Promise<void>;
    associationState: SCTP_STATE;
    started: boolean;
    state: SCTPConnectionState;
    isServer: boolean;
    private hmacKey;
    private localPartialReliability;
    private localPort;
    private localVerificationTag;
    remoteExtensions: number[];
    remotePartialReliability: boolean;
    private remotePort?;
    private remoteVerificationTag;
    private advertisedRwnd;
    private inboundStreams;
    _inboundStreamsCount: number;
    _inboundStreamsMax: number;
    private lastReceivedTsn?;
    private sackDuplicates;
    private sackMisOrdered;
    private sackNeeded;
    private cwnd;
    private fastRecoveryExit?;
    private fastRecoveryTransmit;
    private forwardTsnChunk?;
    private flightSize;
    outboundQueue: DataChunk[];
    private outboundStreamSeq;
    _outboundStreamsCount: number;
    /**local transmission sequence number */
    private localTsn;
    private lastSackedTsn;
    private advancedPeerAckTsn;
    private partialBytesAcked;
    private sentQueue;
    /**初期TSNと同じ値に初期化される単調に増加する数です. これは、新しいre-configuration requestパラメーターを送信するたびに1ずつ増加します */
    reconfigRequestSeq: number;
    /**このフィールドは、incoming要求のre-configuration requestシーケンス番号を保持します. 他の場合では、次に予想されるre-configuration requestシーケンス番号から1を引いた値が保持されます */
    reconfigResponseSeq: number;
    reconfigRequest?: OutgoingSSNResetRequestParam;
    reconfigQueue: number[];
    private srtt?;
    private rttvar?;
    private rto;
    private t1Handle?;
    private t1Chunk?;
    private t1Failures;
    private t2Handle?;
    private t2Chunk?;
    private t2Failures;
    private t3Handle?;
    private ssthresh?;
    constructor(transport: Transport, port?: number);
    get maxChannels(): number | undefined;
    static client(transport: Transport, port?: number): SCTP;
    static server(transport: Transport, port?: number): SCTP;
    private handleData;
    private sendSack;
    private receiveChunk;
    private getExtensions;
    private receiveReconfigParam;
    private receiveDataChunk;
    private receiveSackChunk;
    receiveForwardTsnChunk(chunk: ForwardTsnChunk): void;
    private updateRto;
    private receive;
    private getInboundStream;
    private markReceived;
    send: (streamId: number, ppId: number, userData: Buffer, expiry?: number | undefined, maxRetransmits?: number | undefined, ordered?: boolean) => Promise<void>;
    private transmit;
    transmitReconfig(): Promise<void>;
    sendReconfigParam(param: StreamParam): Promise<void>;
    private sendResetRequest;
    private flightSizeIncrease;
    private flightSizeDecrease;
    private t1Cancel;
    private t1Expired;
    private t1Start;
    private t2Cancel;
    private t2Expired;
    private t2Start;
    private t3Expired;
    private t3Restart;
    private t3Start;
    private t3Cancel;
    private updateAdvancedPeerAckPoint;
    private maybeAbandon;
    static getCapabilities(): RTCSctpCapabilities;
    start(remotePort: number): Promise<void>;
    private init;
    private setExtensions;
    sendChunk(chunk: Chunk): Promise<void>;
    setState(state: SCTP_STATE): void;
    setConnectionState(state: SCTPConnectionState): void;
    stop(): Promise<void>;
    abort(): Promise<void>;
    private removeAllListeners;
}
export declare class InboundStream {
    reassembly: DataChunk[];
    streamSequenceNumber: number;
    constructor();
    addChunk(chunk: DataChunk): void;
    popMessages(): Generator<[number, number, Buffer]>;
    pruneChunks(tsn: number): number;
}
export declare class RTCSctpCapabilities {
    maxMessageSize: number;
    constructor(maxMessageSize: number);
}
export {};
