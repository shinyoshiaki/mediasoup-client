/// <reference types="node" />
import * as dgram from "dgram";
import { Candidate } from "../candidate";
import { Connection } from "../ice";
import { Address, Protocol } from "../types/model";
import { Message } from "./message";
import { Transaction } from "./transaction";
export declare class StunProtocol implements Protocol {
    receiver: Connection;
    readonly type = "stun";
    socket: dgram.Socket;
    transactions: {
        [key: string]: Transaction;
    };
    get transactionsKeys(): string[];
    localCandidate: Candidate;
    sentMessage?: Message;
    localAddress?: string;
    private readonly closed;
    constructor(receiver: Connection);
    connectionLost(): void;
    connectionMade: (useIpv4: boolean) => Promise<void>;
    private datagramReceived;
    get getExtraInfo(): [string, number];
    sendStun(message: Message, addr: Address): void;
    sendData: (data: Buffer, addr: Address) => Promise<void>;
    request(request: Message, addr: Address, integrityKey?: Buffer, retransmissions?: number): Promise<[Message, Address]>;
    close(): Promise<void>;
}
