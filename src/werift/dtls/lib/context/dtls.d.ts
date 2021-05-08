/// <reference types="node" />
import { HashAlgorithms, SignatureAlgorithms } from "../cipher/const";
import { SessionTypes } from "../cipher/suites/abstract";
import { FragmentedHandshake } from "../record/message/fragment";
import { Options } from "../socket";
import { Handshake } from "../typings/domain";
export declare class DtlsContext {
    options: Options;
    sessionType: SessionTypes;
    version: {
        major: number;
        minor: number;
    };
    lastFlight: Handshake[];
    lastMessage: Buffer[];
    recordSequenceNumber: number;
    sequenceNumber: number;
    epoch: number;
    flight: number;
    handshakeCache: {
        isLocal: boolean;
        data: FragmentedHandshake;
        flight: number;
    }[];
    cookie?: Buffer;
    requestedCertificateTypes: number[];
    requestedSignatureAlgorithms: {
        hash: HashAlgorithms;
        signature: SignatureAlgorithms;
    }[];
    remoteExtendedMasterSecret: boolean;
    constructor(options: Options, sessionType: SessionTypes);
    bufferHandshakeCache(handshakes: FragmentedHandshake[], isLocal: boolean, flight: number): void;
}
