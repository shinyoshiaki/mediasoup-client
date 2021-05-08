/// <reference types="node" />
import PCancelable from "p-cancelable";
import Event from "rx.mini";
import { Candidate } from "../candidate";
import { Connection } from "../ice";
import { Message } from "../stun/message";
import { Transaction } from "../stun/transaction";
import { Address, Protocol } from "../types/model";
import { Future } from "../utils";
declare class TurnTransport implements Protocol {
    turn: TurnClient;
    readonly type = "turn";
    localCandidate: Candidate;
    receiver?: Connection;
    constructor(turn: TurnClient);
    private datagramReceived;
    request(request: Message, addr: Address, integrityKey?: Buffer): any;
    connectionMade(): Promise<void>;
    sendData(data: Buffer, addr: Address): Promise<void>;
    sendStun(message: Message, addr: Address): Promise<void>;
}
declare class TurnClient implements Protocol {
    server: Address;
    username: string;
    password: string;
    lifetime: number;
    transport: Transport;
    type: string;
    onData: Event<[Buffer, Address]>;
    transactions: {
        [hexId: string]: Transaction;
    };
    integrityKey?: Buffer;
    nonce?: Buffer;
    realm?: string;
    relayedAddress: Address;
    mappedAddress: Address;
    refreshHandle?: Future;
    channelNumber: number;
    channelByAddr: {
        [key: string]: number;
    };
    addrByChannel: {
        [key: number]: Address;
    };
    localCandidate: Candidate;
    onDatagramReceived: (data: Buffer, addr: Address) => void;
    constructor(server: Address, username: string, password: string, lifetime: number, transport: Transport);
    connectionMade(): Promise<void>;
    private handleChannelData;
    private handleSTUNMessage;
    private datagramReceived;
    connect(): Promise<void>;
    refresh: () => PCancelable<unknown>;
    request(request: Message, addr: Address, integrityKey?: Buffer): Promise<[Message, Address]>;
    sendData(data: Buffer, addr: Address): Promise<void>;
    private channelBind;
    sendStun(message: Message, addr: Address): void;
}
export declare function createTurnEndpoint(serverAddr: Address, username: string, password: string, lifetime?: number, ssl?: boolean, transport?: string): Promise<TurnTransport>;
interface Transport {
    onData: (data: Buffer, addr: Address) => void;
    send: (data: Buffer, addr: Address) => Promise<void>;
}
export {};
