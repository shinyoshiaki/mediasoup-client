/// <reference types="node" />
export declare function unpackErrorCode(data: Buffer): [number, string];
export declare function unpackXorAddress(data: Buffer, transactionId: Buffer): [string, number];
export declare function packErrorCode(value: [number, string]): Buffer;
export declare function packXorAddress(value: [string, number], transactionId: Buffer): Buffer;
export declare type ATTRIBUTE = [
    number,
    string,
    (...args: any) => Buffer,
    (...args: any) => any
];
export declare const ATTRIBUTES_BY_TYPE: {
    [key: string]: ATTRIBUTE;
};
export declare const ATTRIBUTES_BY_NAME: {
    [key: string]: ATTRIBUTE;
};
