/// <reference types="node" />
import { DtlsContext } from "../context/dtls";
import { TransportContext } from "../context/transport";
import { Handshake } from "../typings/domain";
declare const flightTypes: readonly ["PREPARING", "SENDING", "WAITING", "FINISHED"];
declare type FlightType = typeof flightTypes[number];
export declare abstract class Flight {
    private transport;
    dtls: DtlsContext;
    private flight;
    private nextFlight?;
    state: FlightType;
    private buffer;
    constructor(transport: TransportContext, dtls: DtlsContext, flight: number, nextFlight?: number | undefined);
    protected createPacket(handshakes: Handshake[]): import("../record/message/plaintext").DtlsPlaintext[];
    protected transmit(buf: Buffer[]): void;
    protected send: (buf: Buffer[]) => Promise<void[]>;
    private setState;
    retransmitCount: number;
    private retransmit;
}
export {};
