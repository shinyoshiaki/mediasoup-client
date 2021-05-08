/// <reference types="node" />
import EventEmitter from "events";
export declare function enumerate<T>(arr: T[]): [number, T][];
export declare function sleep(ms: number): Promise<void>;
export declare function divide(from: string, split: string): [string, string];
export declare class PromiseQueue {
    queue: {
        promise: () => Promise<any>;
        call: () => void;
    }[];
    running: boolean;
    push: (promise: () => Promise<any>) => Promise<void>;
    run(): Promise<void>;
}
export declare class EventTarget extends EventEmitter {
    addEventListener: (type: string, listener: (...args: any[]) => void) => void;
}
