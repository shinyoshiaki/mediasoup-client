"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTurnEndpoint = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const debug_1 = tslib_1.__importDefault(require("debug"));
const dgram_1 = require("dgram");
const jspack_1 = require("jspack");
const p_cancelable_1 = tslib_1.__importDefault(require("p-cancelable"));
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
const const_1 = require("../stun/const");
const message_1 = require("../stun/message");
const transaction_1 = require("../stun/transaction");
const utils_1 = require("../utils");
const log = debug_1.default("werift/ice/turn/protocol");
const TCP_TRANSPORT = 0x06000000;
const UDP_TRANSPORT = 0x11000000;
class TurnTransport {
    constructor(turn) {
        this.turn = turn;
        this.type = "turn";
        this.datagramReceived = (data, addr) => {
            var _a, _b;
            const message = message_1.parseMessage(data);
            if (!message) {
                (_a = this.receiver) === null || _a === void 0 ? void 0 : _a.dataReceived(data, this.localCandidate.component);
                return;
            }
            if (((message === null || message === void 0 ? void 0 : message.messageClass) === const_1.classes.RESPONSE ||
                (message === null || message === void 0 ? void 0 : message.messageClass) === const_1.classes.ERROR) &&
                this.turn.transactions[message.transactionIdHex]) {
                const transaction = this.turn.transactions[message.transactionIdHex];
                transaction.responseReceived(message, addr);
            }
            else if ((message === null || message === void 0 ? void 0 : message.messageClass) === const_1.classes.REQUEST) {
                (_b = this.receiver) === null || _b === void 0 ? void 0 : _b.requestReceived(message, addr, this, data);
            }
        };
        turn.onDatagramReceived = this.datagramReceived;
    }
    request(request, addr, integrityKey) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.turn.transactions[request.transactionIdHex])
                throw new Error("exist");
            if (integrityKey) {
                request.addMessageIntegrity(integrityKey);
                request.addFingerprint();
            }
            const transaction = new transaction_1.Transaction(request, addr, this);
            transaction.integrityKey = integrityKey;
            this.turn.transactions[request.transactionIdHex] = transaction;
            try {
                return yield transaction.run();
            }
            finally {
                delete this.turn.transactions[request.transactionIdHex];
            }
        });
    }
    connectionMade() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { });
    }
    sendData(data, addr) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.turn.sendData(data, addr);
        });
    }
    sendStun(message, addr) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.turn.sendData(message.bytes, addr);
        });
    }
}
class TurnClient {
    constructor(server, username, password, lifetime, transport) {
        this.server = server;
        this.username = username;
        this.password = password;
        this.lifetime = lifetime;
        this.transport = transport;
        this.type = "inner_turn";
        this.onData = new rx_mini_1.default();
        this.transactions = {};
        this.channelNumber = 0x4000;
        this.channelByAddr = {};
        this.addrByChannel = {};
        this.onDatagramReceived = () => { };
        this.refresh = () => new p_cancelable_1.default((r, f, onCancel) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            let run = true;
            onCancel(() => {
                run = false;
                f("cancel");
            });
            while (run) {
                // refresh before expire
                yield utils_1.sleep((5 / 6) * this.lifetime * 1000);
                const request = new message_1.Message(const_1.methods.REFRESH, const_1.classes.REQUEST);
                request.attributes.LIFETIME = this.lifetime;
                yield this.request(request, this.server, this.integrityKey).catch(
                // todo fix
                log);
            }
        }));
    }
    connectionMade() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.transport.onData = (data, addr) => {
                this.datagramReceived(data, addr);
            };
        });
    }
    handleChannelData(data) {
        const [channel, length] = jspack_1.jspack.Unpack("!HH", data.slice(0, 4));
        const peerAddr = this.addrByChannel[channel];
        if (peerAddr) {
            const payload = data.slice(4, 4 + length);
            this.onDatagramReceived(payload, peerAddr);
        }
    }
    handleSTUNMessage(data, addr) {
        try {
            const message = message_1.parseMessage(data);
            if (!message)
                throw new Error("not stun message");
            if (message.messageClass === const_1.classes.RESPONSE ||
                message.messageClass === const_1.classes.ERROR) {
                const transaction = this.transactions[message.transactionIdHex];
                if (transaction)
                    transaction.responseReceived(message, addr);
            }
            else if (message.messageClass === const_1.classes.REQUEST) {
                this.onDatagramReceived(data, addr);
            }
            if (message.attributes.DATA) {
                const buf = message.attributes.DATA;
                this.onDatagramReceived(buf, addr);
            }
        }
        catch (error) {
            log("parse error", data.toString());
        }
    }
    datagramReceived(data, addr) {
        if (data.length >= 4 && isChannelData(data)) {
            this.handleChannelData(data);
            return;
        }
        this.handleSTUNMessage(data, addr);
    }
    connect() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const request = new message_1.Message(const_1.methods.ALLOCATE, const_1.classes.REQUEST);
            request.attributes["LIFETIME"] = this.lifetime;
            request.attributes["REQUESTED-TRANSPORT"] = UDP_TRANSPORT;
            let response;
            try {
                [response] = yield this.request(request, this.server, this.integrityKey);
            }
            catch (error) {
                log("error", error);
                response = error.response;
                if (response.attributes["ERROR-CODE"][0] === 401) {
                    this.nonce = response.attributes.NONCE;
                    this.realm = response.attributes.REALM;
                    this.integrityKey = makeIntegrityKey(this.username, this.realm, this.password);
                    request.transactionId = utils_1.randomTransactionId();
                    try {
                        [response] = yield this.request(request, this.server, this.integrityKey);
                    }
                    catch (error) {
                        log(error);
                        // todo fix
                    }
                }
            }
            this.relayedAddress = response.attributes["XOR-RELAYED-ADDRESS"];
            this.mappedAddress = response.attributes["XOR-MAPPED-ADDRESS"];
            this.refreshHandle = utils_1.future(this.refresh());
        });
    }
    request(request, addr, integrityKey) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.transactions[request.transactionIdHex])
                throw new Error("exist");
            if (integrityKey) {
                request.addMessageIntegrity(integrityKey);
                request.attributes["USERNAME"] = this.username;
                request.attributes["REALM"] = this.realm;
                request.attributes["NONCE"] = this.nonce;
                request.addFingerprint();
            }
            const transaction = new transaction_1.Transaction(request, addr, this);
            transaction.integrityKey = integrityKey;
            this.transactions[request.transactionIdHex] = transaction;
            try {
                return yield transaction.run();
            }
            finally {
                delete this.transactions[request.transactionIdHex];
            }
        });
    }
    sendData(data, addr) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let channel = this.channelByAddr[addr.join()];
            if (!channel) {
                channel = this.channelNumber++;
                this.channelByAddr[addr.join()] = channel;
                this.addrByChannel[channel] = addr;
                yield this.channelBind(channel, addr);
                log("bind", channel);
            }
            const header = jspack_1.jspack.Pack("!HH", [channel, data.length]);
            this.transport.send(Buffer.concat([Buffer.from(header), data]), this.server);
        });
    }
    channelBind(channelNumber, addr) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const request = new message_1.Message(const_1.methods.CHANNEL_BIND, const_1.classes.REQUEST);
            request.attributes["CHANNEL-NUMBER"] = channelNumber;
            request.attributes["XOR-PEER-ADDRESS"] = addr;
            try {
                const [response] = yield this.request(request, this.server, this.integrityKey);
                if (response.messageMethod !== const_1.methods.CHANNEL_BIND)
                    throw new Error();
            }
            catch (error) {
                log(error);
                // todo fix
            }
        });
    }
    sendStun(message, addr) {
        this.transport.send(message.bytes, addr);
    }
}
function createTurnEndpoint(serverAddr, username, password, lifetime = 600, ssl = false, transport = "udp") {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const turnClient = new TurnClient(serverAddr, username, password, lifetime, new UdpTransport());
        yield turnClient.connectionMade();
        yield turnClient.connect();
        const turnTransport = new TurnTransport(turnClient);
        return turnTransport;
    });
}
exports.createTurnEndpoint = createTurnEndpoint;
function makeIntegrityKey(username, realm, password) {
    return crypto_1.createHash("md5")
        .update(Buffer.from([username, realm, password].join(":")))
        .digest();
}
class UdpTransport {
    constructor() {
        this.socket = dgram_1.createSocket("udp4");
        this.onData = () => { };
        this.send = (data, addr) => new Promise((r) => this.socket.send(data, addr[1], addr[0], (error) => {
            if (error) {
                log("send error", addr, data);
            }
            r();
        }));
        this.socket.bind();
        this.socket.on("message", (data, rInfo) => {
            this._address = [rInfo.address, rInfo.port];
            this.onData(data, this._address);
        });
    }
}
function isChannelData(data) {
    return (data[0] & 0xc0) == 0x40;
}
//# sourceMappingURL=protocol.js.map