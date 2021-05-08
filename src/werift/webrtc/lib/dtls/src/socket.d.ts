/// <reference types="node" />
import { TransportContext } from "./context/transport";
import { DtlsContext } from "./context/dtls";
import { CipherContext } from "./context/cipher";
import { Transport } from "./transport";
import { SignatureHash } from "./cipher/const";
import { Extension } from "./typings/domain";
import { SrtpContext } from "./context/srtp";
import { Event } from "rx.mini";
import { SessionTypes } from "./cipher/suites/abstract";
import { FragmentedHandshake } from "./record/message/fragment";
export declare class DtlsSocket {
    options: Options;
    sessionType: SessionTypes;
    readonly onConnect: Event<any[]>;
    readonly onData: Event<[Buffer]>;
    readonly onClose: Event<any[]>;
    readonly transport: TransportContext;
    readonly cipher: CipherContext;
    readonly dtls: DtlsContext;
    readonly srtp: SrtpContext;
    extensions: Extension[];
    onHandleHandshakes: (assembled: FragmentedHandshake[]) => void;
    private bufferFragmentedHandshakes;
    constructor(options: Options, sessionType: SessionTypes);
    private udpOnMessage;
    private setupExtensions;
    handleFragmentHandshake(messages: FragmentedHandshake[]): FragmentedHandshake[];
    send: (buf: Buffer) => Promise<void>;
    close(): void;
    extractSessionKeys(): {
        localKey: any;
        localSalt: any;
        remoteKey: any;
        remoteSalt: any;
    };
    exportKeyingMaterial(label: string, length: number): Buffer;
}
export interface Options {
    transport: Transport;
    srtpProfiles?: number[];
    cert?: string;
    key?: string;
    signatureHash?: SignatureHash;
    certificateRequest?: boolean;
    extendedMasterSecret?: boolean;
}
