"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StunProtocol = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const dgram = tslib_1.__importStar(require("dgram"));
const rx_mini_1 = require("rx.mini");
const const_1 = require("./const");
const message_1 = require("./message");
const transaction_1 = require("./transaction");
const log = debug_1.default("werift/ice/stun/protocol");
class StunProtocol {
    constructor(receiver) {
        this.receiver = receiver;
        this.type = "stun";
        this.socket = dgram.createSocket("udp4");
        this.transactions = {};
        this.closed = new rx_mini_1.Event();
        this.connectionMade = async (useIpv4) => {
            if (!useIpv4) {
                this.socket = dgram.createSocket("udp6");
            }
            this.socket.bind();
            await new Promise((r) => this.socket.once("listening", r));
            this.socket.on("message", (data, info) => {
                if (info.family === "IPv6") {
                    [info.address] = info.address.split("%"); // example fe80::1d3a:8751:4ffd:eb80%wlp82s0
                }
                this.datagramReceived(data, [info.address, info.port]);
            });
        };
        this.sendData = (data, addr) => new Promise((r) => {
            const [host, port] = addr;
            this.socket.send(data, port, host, (error, size) => {
                if (error) {
                    log("sendData error", port, host, size, error);
                }
                r();
            });
        });
    }
    get transactionsKeys() {
        return Object.keys(this.transactions);
    }
    connectionLost() {
        this.closed.execute();
        this.closed.complete();
    }
    datagramReceived(data, addr) {
        const message = message_1.parseMessage(data);
        if (!message) {
            this.receiver.dataReceived(data, this.localCandidate.component);
            return;
        }
        // log("parseMessage", addr, message);
        if ((message.messageClass === const_1.classes.RESPONSE ||
            message.messageClass === const_1.classes.ERROR) &&
            this.transactionsKeys.includes(message.transactionIdHex)) {
            const transaction = this.transactions[message.transactionIdHex];
            transaction.responseReceived(message, addr);
        }
        else if (message.messageClass === const_1.classes.REQUEST) {
            this.receiver.requestReceived(message, addr, this, data);
        }
    }
    get getExtraInfo() {
        const { address: host, port } = this.socket.address();
        return [host, port];
    }
    sendStun(message, addr) {
        const [host, port] = addr;
        const data = message.bytes;
        try {
            this.socket.send(data, port, host, (error, size) => {
                if (error) {
                    log("sendStun error", port, host, size, error);
                }
            });
        }
        catch (error) { }
    }
    async request(request, addr, integrityKey, retransmissions) {
        // """
        // Execute a STUN transaction and return the response.
        // """
        if (this.transactionsKeys.includes(request.transactionIdHex))
            throw new Error("already request ed");
        if (integrityKey) {
            request.addMessageIntegrity(integrityKey);
            request.addFingerprint();
        }
        const transaction = new transaction_1.Transaction(request, addr, this, retransmissions);
        transaction.integrityKey = integrityKey;
        this.transactions[request.transactionIdHex] = transaction;
        try {
            return await transaction.run();
        }
        finally {
            delete this.transactions[request.transactionIdHex];
        }
    }
    async close() {
        await new Promise((r) => {
            this.socket.once("close", r);
            try {
                this.socket.close();
            }
            catch (error) {
                r();
            }
        });
    }
}
exports.StunProtocol = StunProtocol;
//# sourceMappingURL=protocol.js.map