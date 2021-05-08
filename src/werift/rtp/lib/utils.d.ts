export declare class BitWriter {
    private bitLength;
    value: number;
    constructor(bitLength: number);
    set(size: number, startIndex: number, value: number): this;
}
export declare function getBit(bits: number, startIndex: number, length?: number): number;
