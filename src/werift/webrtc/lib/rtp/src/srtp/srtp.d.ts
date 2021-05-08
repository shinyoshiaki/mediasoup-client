/// <reference types="node" />
import { RtpHeader } from "../rtp/rtp";
import { SrtpContext } from "./context/srtp";
import { Config, Session } from "./session";
export declare class SrtpSession extends Session<SrtpContext> {
    config: Config;
    constructor(config: Config);
    decrypt: (buf: Buffer) => Buffer;
    encrypt(payload: Buffer, header: RtpHeader): Buffer;
}
