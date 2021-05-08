import { TransportContext } from "../../context/transport";
import { DtlsContext } from "../../context/dtls";
import { CipherContext } from "../../context/cipher";
import { Extension } from "../../typings/domain";
import { Flight } from "../flight";
export declare class Flight1 extends Flight {
    private cipher;
    constructor(udp: TransportContext, dtls: DtlsContext, cipher: CipherContext);
    exec(extensions: Extension[]): void;
}
