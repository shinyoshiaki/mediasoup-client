/// <reference types="node" />
import { HandshakeType } from "../handshake/const";
import { FragmentedHandshake } from "../record/message/fragment";
export declare type Version = {
    major: number;
    minor: number;
};
export declare type Random = {
    gmt_unix_time: number;
    random_bytes: Buffer;
};
export declare type Handshake = {
    msgType: HandshakeType;
    messageSeq?: number;
    serialize: () => Buffer;
    toFragment: () => FragmentedHandshake;
};
export declare type Extension = {
    type: number;
    data: Buffer;
};
