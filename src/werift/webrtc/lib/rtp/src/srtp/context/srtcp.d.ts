/// <reference types="node" />
import { Context } from "./context";
import { RtcpHeader } from "../../rtcp/header";
export declare class SrtcpContext extends Context {
    constructor(masterKey: Buffer, masterSalt: Buffer, profile: number);
    decryptRTCP(encrypted: Buffer): [Buffer, RtcpHeader];
    encryptRTCP(rawRtcp: Buffer): Buffer;
}
