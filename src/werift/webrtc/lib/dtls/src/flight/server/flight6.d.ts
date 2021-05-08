/// <reference types="node" />
import { DtlsContext } from "../../context/dtls";
import { TransportContext } from "../../context/transport";
import { CipherContext } from "../../context/cipher";
import { FragmentedHandshake } from "../../record/message/fragment";
import { Flight } from "../flight";
export declare class Flight6 extends Flight {
    private cipher;
    constructor(udp: TransportContext, dtls: DtlsContext, cipher: CipherContext);
    handleHandshake(handshake: FragmentedHandshake): void;
    exec(): void;
    sendChangeCipherSpec(): Buffer;
    sendFinished(): Buffer;
}
