/// <reference types="node" />
import { Socket, RemoteInfo } from "dgram";
export interface Transport {
    onData?: (buf: Buffer) => void;
    send: (buf: Buffer) => void;
    close: () => void;
}
export declare class UdpTransport implements Transport {
    private upd;
    private rinfo;
    constructor(upd: Socket, rinfo: Partial<RemoteInfo>);
    onData?: (buf: Buffer) => void;
    send(buf: Buffer): void;
    close(): void;
}
export declare const createUdpTransport: (socket: Socket, rinfo?: Partial<RemoteInfo>) => UdpTransport;
