/// <reference types="node" />
import { Event } from "rx.mini";
import { EventTarget } from "./helper";
import { RTCSctpTransport } from "./transport/sctp";
export declare class RTCDataChannel extends EventTarget {
    private readonly transport;
    private readonly parameters;
    readonly sendOpen: boolean;
    readonly stateChanged: Event<[DCState]>;
    readonly message: Event<[string | Buffer]>;
    readonly error: Event<[Error]>;
    readonly bufferedAmountLow: Event<any[]>;
    onopen?: (() => void) | null;
    onclose?: (() => void) | null;
    onclosing?: (() => void) | null;
    onerror?: ((props: {
        error: any;
    }) => void) | null;
    isCreatedByRemote: boolean;
    id: number;
    readyState: DCState;
    bufferedAmount: number;
    private _bufferedAmountLowThreshold;
    constructor(transport: RTCSctpTransport, parameters: RTCDataChannelParameters, sendOpen?: boolean);
    get ordered(): boolean;
    get maxRetransmits(): number | undefined;
    get maxPacketLifeTime(): number | undefined;
    get label(): string;
    get protocol(): string;
    get negotiated(): boolean;
    get bufferedAmountLowThreshold(): number;
    set bufferedAmountLowThreshold(value: number);
    setId(id: number): void;
    setReadyState(state: DCState): void;
    addBufferedAmount(amount: number): void;
    send(data: Buffer | string): void;
    close(): void;
}
export declare type DCState = "open" | "closed" | "connecting" | "closing";
export declare class RTCDataChannelParameters {
    label: string;
    maxPacketLifeTime?: number;
    maxRetransmits?: number;
    ordered: boolean;
    protocol: string;
    negotiated: boolean;
    id: number;
    constructor(props?: Partial<RTCDataChannelParameters>);
}
