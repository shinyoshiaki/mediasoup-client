"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientHello = void 0;
const binary_data_1 = require("binary-data");
const const_1 = require("../../const");
const binary_1 = require("../../binary");
const fragment_1 = require("../../../record/message/fragment");
const random_1 = require("../../random");
// 7.4.1.2.  Client Hello
class ClientHello {
    constructor(clientVersion, random, sessionId, cookie, cipherSuites, compressionMethods, extensions) {
        this.clientVersion = clientVersion;
        this.random = random;
        this.sessionId = sessionId;
        this.cookie = cookie;
        this.cipherSuites = cipherSuites;
        this.compressionMethods = compressionMethods;
        this.extensions = extensions;
        this.msgType = const_1.HandshakeType.client_hello;
        this.messageSeq = 0;
    }
    static createEmpty() {
        return new ClientHello(undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    }
    static deSerialize(buf) {
        return new ClientHello(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, ClientHello.spec)));
    }
    serialize() {
        const res = binary_data_1.encode(this, ClientHello.spec).slice();
        return Buffer.from(res);
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.ClientHello = ClientHello;
ClientHello.spec = {
    clientVersion: { major: binary_data_1.types.uint8, minor: binary_data_1.types.uint8 },
    random: random_1.DtlsRandom.spec,
    sessionId: binary_data_1.types.buffer(binary_data_1.types.uint8),
    cookie: binary_data_1.types.buffer(binary_data_1.types.uint8),
    cipherSuites: binary_data_1.types.array(binary_data_1.types.uint16be, binary_data_1.types.uint16be, "bytes"),
    compressionMethods: binary_data_1.types.array(binary_data_1.types.uint8, binary_data_1.types.uint8, "bytes"),
    extensions: binary_1.ExtensionList,
};
//# sourceMappingURL=hello.js.map