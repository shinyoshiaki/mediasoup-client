import Event from "rx.mini";
import { Candidate, Connection, IceOptions } from "../../../ice/src";
export declare class RTCIceTransport {
    private gather;
    connection: Connection;
    state: IceTransportState;
    readonly onStateChange: Event<["disconnected" | "closed" | "completed" | "failed" | "new" | "connected" | "checking"]>;
    private waitStart?;
    constructor(gather: RTCIceGatherer);
    get iceGather(): RTCIceGatherer;
    get role(): "controlling" | "controlled";
    private setState;
    addRemoteCandidate: (candidate?: RTCIceCandidate | undefined) => Promise<void>;
    start(remoteParameters: RTCIceParameters): Promise<void>;
    stop(): Promise<void>;
}
export declare const IceTransportStates: readonly ["new", "checking", "connected", "completed", "disconnected", "failed", "closed"];
export declare type IceTransportState = typeof IceTransportStates[number];
export declare const IceGathererStates: readonly ["new", "gathering", "complete"];
export declare type IceGathererState = typeof IceGathererStates[number];
export declare class RTCIceGatherer {
    private options;
    onIceCandidate: (candidate: RTCIceCandidate) => void;
    gatheringState: IceGathererState;
    readonly onGatheringStateChange: Event<["new" | "gathering" | "complete"]>;
    readonly connection: Connection;
    constructor(options?: Partial<IceOptions>);
    gather(): Promise<void>;
    get localCandidates(): RTCIceCandidate[];
    get localParameters(): RTCIceParameters;
    private setState;
}
export declare function candidateFromIce(c: Candidate): RTCIceCandidate;
export declare function candidateToIce(x: RTCIceCandidate): Candidate;
export declare type RTCIceCandidateJSON = {
    candidate: string;
    sdpMid: string;
    sdpMLineIndex: number;
};
export declare class RTCIceCandidate {
    component: number;
    foundation: string;
    ip: string;
    port: number;
    priority: number;
    protocol: string;
    type: string;
    relatedAddress?: string;
    relatedPort?: number;
    sdpMid?: string;
    sdpMLineIndex?: number;
    tcpType?: string;
    constructor(component: number, foundation: string, ip: string, port: number, priority: number, protocol: string, type: string);
    toJSON(): RTCIceCandidateJSON;
    static fromJSON(data: RTCIceCandidateJSON): RTCIceCandidate | undefined;
}
export declare class RTCIceParameters {
    iceLite: boolean;
    usernameFragment: string;
    password: string;
    constructor(props?: Partial<RTCIceParameters>);
}
