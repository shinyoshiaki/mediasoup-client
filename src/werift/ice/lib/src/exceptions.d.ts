import { Message } from "./stun/message";
export declare class TransactionError extends Error {
    response?: Message;
}
export declare class TransactionFailed extends TransactionError {
    response: Message;
    constructor(response: Message);
    get str(): string;
}
export declare class TransactionTimeout extends TransactionError {
    get str(): string;
}
