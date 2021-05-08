/// <reference types="node" />
import PCancelable from "p-cancelable";
import { Event } from "rx.mini";
import { Candidate } from "./candidate";
import { Address, Protocol } from "./types/model";
import { Future } from "./utils";
import { Message } from "./stun/message";
export declare enum CandidatePairState {
    FROZEN = 0,
    WAITING = 1,
    IN_PROGRESS = 2,
    SUCCEEDED = 3,
    FAILED = 4
}
declare type IceState = "disconnected" | "closed" | "completed";
export interface IceOptions {
    components: number;
    stunServer?: Address;
    turnServer?: Address;
    turnUsername?: string;
    turnPassword?: string;
    turnSsl?: boolean;
    turnTransport?: string;
    forceTurn?: boolean;
    useIpv4: boolean;
    useIpv6: boolean;
}
export declare class Connection {
    iceControlling: boolean;
    remotePassword: string;
    remoteUsername: string;
    localUserName: string;
    localPassword: string;
    remoteIsLite: boolean;
    checkList: CandidatePair[];
    localCandidates: Candidate[];
    stunServer?: Address;
    turnServer?: Address;
    useIpv4: boolean;
    useIpv6: boolean;
    options: IceOptions;
    remoteCandidatesEnd: boolean;
    _components: Set<number>;
    _localCandidatesEnd: boolean;
    _tieBreaker: BigInt;
    readonly onData: Event<[Buffer, number]>;
    readonly stateChanged: Event<[IceState]>;
    private _remoteCandidates;
    private nominated;
    get nominatedKeys(): string[];
    private nominating;
    get remoteAddr(): Address;
    private checkListDone;
    private checkListState;
    private earlyChecks;
    private localCandidatesStart;
    private protocols;
    private queryConsentHandle?;
    private promiseGatherCandidates?;
    constructor(iceControlling: boolean, options?: Partial<IceOptions>);
    gatherCandidates(cb?: (candidate: Candidate) => void): Promise<void>;
    private getComponentCandidates;
    connect(): Promise<void>;
    private unfreezeInitial;
    private schedulingChecks;
    private queryConsent;
    close(): Promise<void>;
    addRemoteCandidate(remoteCandidate: Candidate | undefined): Promise<void>;
    send: (data: Buffer) => Promise<void>;
    private sendTo;
    getDefaultCandidate(component: number): Candidate | undefined;
    requestReceived(message: Message, addr: Address, protocol: Protocol, rawData: Buffer): void;
    dataReceived(data: Buffer, component: number): void;
    set remoteCandidates(value: Candidate[]);
    get remoteCandidates(): Candidate[];
    private pruneComponents;
    private sortCheckList;
    private findPair;
    private checkState;
    private switchRole;
    private checkComplete;
    checkStart: (pair: CandidatePair) => PCancelable<unknown>;
    checkIncoming(message: Message, addr: Address, protocol: Protocol): void;
    private pairRemoteCandidate;
    private buildRequest;
    private respondError;
}
export declare class CandidatePair {
    protocol: Protocol;
    remoteCandidate: Candidate;
    handle?: Future;
    nominated: boolean;
    remoteNominated: boolean;
    state: CandidatePairState;
    constructor(protocol: Protocol, remoteCandidate: Candidate);
    get localCandidate(): Candidate;
    get remoteAddr(): Address;
    get component(): number;
}
export declare function validateRemoteCandidate(candidate: Candidate): Candidate;
export declare function sortCandidatePairs(pairs: CandidatePair[], iceControlling: boolean): void;
export declare function candidatePairPriority(local: Candidate, remote: Candidate, iceControlling: boolean): number;
export declare function getHostAddress(useIpv4: boolean, useIpv6: boolean): string[];
export declare function serverReflexiveCandidate(protocol: Protocol, stunServer: Address): Promise<Candidate | undefined>;
export {};
