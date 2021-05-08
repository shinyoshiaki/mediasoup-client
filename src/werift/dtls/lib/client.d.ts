import { DtlsSocket, Options } from "./socket";
export declare class DtlsClient extends DtlsSocket {
    constructor(options: Options);
    connect(): void;
    private flight5;
    private handleHandshakes;
}
