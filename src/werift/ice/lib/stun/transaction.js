"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const rx_mini_1 = require("rx.mini");
const exceptions_1 = require("../exceptions");
const const_1 = require("./const");
const log = debug_1.default("werift/ice/stun/transaction");
class Transaction {
    constructor(request, addr, protocol, retransmissions) {
        this.request = request;
        this.addr = addr;
        this.protocol = protocol;
        this.retransmissions = retransmissions;
        this.timeoutDelay = const_1.RETRY_RTO;
        this.tries = 0;
        this.triesMax = 1 + (this.retransmissions ? this.retransmissions : const_1.RETRY_MAX);
        this.onResponse = new rx_mini_1.Event();
        this.responseReceived = (message, addr) => {
            if (this.onResponse.length > 0) {
                if (message.messageClass === const_1.classes.RESPONSE) {
                    this.onResponse.execute(message, addr);
                    this.onResponse.complete();
                }
                else {
                    this.onResponse.error(new exceptions_1.TransactionFailed(message));
                }
            }
        };
        this.run = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                this.retry();
                return yield this.onResponse.asPromise();
            }
            finally {
                if (this.timeoutHandle) {
                    clearTimeout(this.timeoutHandle);
                }
            }
        });
        this.retry = () => {
            if (this.tries >= this.triesMax) {
                log("retry failed", this.tries);
                this.onResponse.error(new exceptions_1.TransactionTimeout());
                return;
            }
            this.protocol.sendStun(this.request, this.addr);
            this.timeoutHandle = setTimeout(this.retry, this.timeoutDelay);
            this.timeoutDelay *= 2;
            this.tries++;
        };
    }
    // todo use
    cancel() {
        if (this.timeoutHandle)
            clearTimeout(this.timeoutHandle);
    }
}
exports.Transaction = Transaction;
//# sourceMappingURL=transaction.js.map