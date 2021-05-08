/// <reference types="node" />
import { Context } from "./context/context";
export declare type SessionKeys = {
    localMasterKey: Buffer;
    localMasterSalt: Buffer;
    remoteMasterKey: Buffer;
    remoteMasterSalt: Buffer;
};
export declare type Config = {
    keys: SessionKeys;
    profile: number;
};
export declare class Session<T extends Context> {
    private ContextCls;
    localContext: T;
    remoteContext: T;
    onData?: (buf: Buffer) => void;
    constructor(ContextCls: any);
    start(localMasterKey: Buffer, localMasterSalt: Buffer, remoteMasterKey: Buffer, remoteMasterSalt: Buffer, profile: number): void;
}
