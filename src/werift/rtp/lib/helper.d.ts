/// <reference types="node" />
export declare function enumerate<T>(arr: T[]): [number, T][];
export declare function sleep(ms: number): Promise<void>;
export declare function bufferWriter(bytes: number[], values: (number | bigint)[]): Buffer;
export declare function bufferReader(buf: Buffer, bytes: number[]): any[];
export declare function growBufferSize(buf: Buffer, size: number): Buffer;
export declare function Int(v: number): number;
