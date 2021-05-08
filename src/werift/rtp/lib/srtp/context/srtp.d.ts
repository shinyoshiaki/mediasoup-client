/// <reference types="node" />
import { RtpHeader } from "../../rtp/rtp";
import { Context } from "./context";
export declare class SrtpContext extends Context {
    constructor(masterKey: Buffer, masterSalt: Buffer, profile: number);
    decryptRTP(ciphertext: Buffer, header?: RtpHeader): [Buffer, RtpHeader];
    encryptRTP(payload: Buffer, header: RtpHeader): Buffer;
}
