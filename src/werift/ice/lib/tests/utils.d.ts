/// <reference types="node" />
import { Connection } from "../src/ice";
export declare function readMessage(name: string): Buffer;
export declare function inviteAccept(a: Connection, b: Connection): Promise<void>;
export declare function assertCandidateTypes(conn: Connection, expected: string[]): void;
