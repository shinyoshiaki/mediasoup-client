"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionTimeout = exports.TransactionFailed = exports.TransactionError = void 0;
class TransactionError extends Error {
}
exports.TransactionError = TransactionError;
class TransactionFailed extends TransactionError {
    constructor(response) {
        super();
        this.response = response;
    }
    get str() {
        let out = "STUN transaction failed";
        if (Object.keys(this.response.attributes).includes("ERROR-CODE")) {
            const [code, msg] = this.response.attributes["ERROR-CODE"];
            out += ` (${code} - ${msg})`;
        }
        return out;
    }
}
exports.TransactionFailed = TransactionFailed;
class TransactionTimeout extends TransactionError {
    get str() {
        return "STUN transaction timed out";
    }
}
exports.TransactionTimeout = TransactionTimeout;
//# sourceMappingURL=exceptions.js.map