/// <reference types="node" />
import { Address } from "../../ice/src";
import { Direction } from "./media/rtpTransceiver";
import { IceServer } from "./peerConnection";
export declare function fingerprint(file: Buffer, hashName: string): any;
export declare function isDtls(buf: Buffer): boolean;
export declare function isMedia(buf: Buffer): boolean;
export declare function isRtcp(buf: Buffer): boolean;
export declare function reverseSimulcastDirection(dir: "recv" | "send"): "send" | "recv";
export declare const andDirection: (a: Direction, b: Direction) => "inactive" | "sendonly" | "recvonly" | "sendrecv";
export declare const orDirection: (a: Direction, b: Direction) => "inactive" | "sendonly" | "recvonly" | "sendrecv";
export declare function reverseDirection(dir: Direction): Direction;
export declare const microTime: () => number;
export declare const milliTime: () => number;
export declare const ntpTime: () => bigint;
export declare function random16(): any;
export declare function random32(): bigint;
export declare function uint8Add(a: number, b: number): number;
export declare function uint16Add(a: number, b: number): number;
export declare function uint32Add(a: bigint, b: bigint): bigint;
export declare function uint24(v: number): number;
export declare function parseIceServers(iceServers: IceServer[]): {
    stunServer: Address | undefined;
    turnServer: Address | undefined;
    turnUsername: string | undefined;
    turnPassword: string | undefined;
};
