export declare function enumerate<T>(arr: T[]): [number, T][];
export declare function sleep(ms: number): Promise<void>;
export declare type Unpacked<T> = T extends {
    [K in keyof T]: infer U;
} ? U : never;
export declare function createEventsFromList<T extends any>(list: readonly T[]): any;
