import { TransportContext } from "../../context/transport";
import { DtlsContext } from "../../context/dtls";
import { CipherContext } from "../../context/cipher";
import { SrtpContext } from "../../context/srtp";
import { Flight } from "../flight";
import { FragmentedHandshake } from "../../record/message/fragment";
export declare class Flight4 extends Flight {
    private cipher;
    private srtp;
    constructor(udp: TransportContext, dtls: DtlsContext, cipher: CipherContext, srtp: SrtpContext);
    exec(assemble: FragmentedHandshake, certificateRequest?: boolean): void;
    private sendServerHello;
    private sendCertificate;
    private sendServerKeyExchange;
    private sendCertificateRequest;
    private sendServerHelloDone;
}
