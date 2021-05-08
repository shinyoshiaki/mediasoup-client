export declare class Candidate {
    foundation: string;
    component: number;
    transport: string;
    priority: number;
    host: string;
    port: number;
    type: string;
    relatedAddress?: string | undefined;
    relatedPort?: number | undefined;
    tcptype?: string | undefined;
    generation?: number | undefined;
    constructor(foundation: string, component: number, transport: string, priority: number, host: string, port: number, type: string, relatedAddress?: string | undefined, relatedPort?: number | undefined, tcptype?: string | undefined, generation?: number | undefined);
    static fromSdp(sdp: string): Candidate;
    canPairWith(other: Candidate): boolean;
    toSdp(): string;
}
export declare function candidateFoundation(candidateType: string, candidateTransport: string, baseAddress: string): string;
export declare function candidatePriority(candidateComponent: number, candidateType: string, localPref?: number): number;
