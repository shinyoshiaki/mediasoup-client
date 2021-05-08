import { TransportContext } from "../../context/transport";
import { DtlsContext } from "../../context/dtls";
import { ServerHelloVerifyRequest } from "../../handshake/message/server/helloVerifyRequest";
import { Flight } from "../flight";
export declare class Flight3 extends Flight {
    constructor(udp: TransportContext, dtls: DtlsContext);
    exec(verifyReq: ServerHelloVerifyRequest): void;
}
