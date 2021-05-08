/// <reference types="node" />
import { Address, Protocol } from "../types/model";
import { Message } from "./message";
export declare class Transaction {
    private request;
    private addr;
    private protocol;
    private retransmissions?;
    integrityKey?: Buffer;
    private timeoutDelay;
    private timeoutHandle?;
    private tries;
    private readonly triesMax;
    private readonly onResponse;
    constructor(request: Message, addr: Address, protocol: Protocol, retransmissions?: number | undefined);
    responseReceived: (message: Message, addr: Address) => void;
    run: () => Promise<[Message, Address]>;
    private retry;
    cancel(): void;
}
