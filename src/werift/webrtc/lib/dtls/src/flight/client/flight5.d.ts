/// <reference types="node" />
import { DtlsContext } from "../../context/dtls";
import { TransportContext } from "../../context/transport";
import { CipherContext } from "../../context/cipher";
import { SrtpContext } from "../../context/srtp";
import { Flight } from "../flight";
import { FragmentedHandshake } from "../../record/message/fragment";
export declare class Flight5 extends Flight {
    private cipher;
    private srtp;
    constructor(udp: TransportContext, dtls: DtlsContext, cipher: CipherContext, srtp: SrtpContext);
    handleHandshake(handshake: FragmentedHandshake): void;
    exec(): void;
    sendCertificate(): Buffer;
    sendClientKeyExchange(): Buffer;
    sendCertificateVerify(): Buffer;
    sendChangeCipherSpec(): Buffer;
    sendFinished(): Buffer;
}
