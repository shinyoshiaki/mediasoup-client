/// <reference types="node" />
import { Transport } from "../transport";
export declare class TransportContext {
    socket: Transport;
    constructor(socket: Transport);
    readonly send: (buf: Buffer) => Promise<void>;
}
