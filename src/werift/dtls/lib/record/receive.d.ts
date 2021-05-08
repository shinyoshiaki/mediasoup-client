/// <reference types="node" />
import { CipherContext } from "../context/cipher";
import { DtlsContext } from "../context/dtls";
import { ContentType } from "./const";
import { FragmentedHandshake } from "./message/fragment";
import { DtlsPlaintext } from "./message/plaintext";
export declare const parsePacket: (data: Buffer) => DtlsPlaintext[];
export declare const parsePlainText: (dtls: DtlsContext, cipher: CipherContext) => (plain: DtlsPlaintext) => {
    type: ContentType;
    data: undefined;
} | {
    type: ContentType;
    data: FragmentedHandshake;
} | {
    type: ContentType;
    data: Buffer;
};
