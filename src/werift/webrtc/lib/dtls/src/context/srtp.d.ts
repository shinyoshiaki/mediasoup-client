export declare class SrtpContext {
    srtpProfile?: number;
    static findMatchingSRTPProfile(remote: number[], local: number[]): number | undefined;
}
