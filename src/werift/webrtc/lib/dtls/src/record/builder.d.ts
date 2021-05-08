/// <reference types="node" />
import { DtlsContext } from "../context/dtls";
import { Handshake } from "../typings/domain";
import { DtlsPlaintext } from "./message/plaintext";
export declare type Message = {
    type: number;
    fragment: Buffer;
};
export declare const createFragments: (dtls: DtlsContext) => (handshakes: Handshake[]) => import("./message/fragment").FragmentedHandshake[];
export declare const createPlaintext: (dtls: DtlsContext) => (fragments: Message[], recordSequenceNumber: number) => DtlsPlaintext[];
