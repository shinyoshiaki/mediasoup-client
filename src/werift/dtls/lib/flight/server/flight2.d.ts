import { ClientHello } from "../../handshake/message/client/hello";
import { TransportContext } from "../../context/transport";
import { DtlsContext } from "../../context/dtls";
import { CipherContext } from "../../context/cipher";
import { SrtpContext } from "../../context/srtp";
export declare const flight2: (udp: TransportContext, dtls: DtlsContext, cipher: CipherContext, srtp: SrtpContext) => (clientHello: ClientHello) => void;
