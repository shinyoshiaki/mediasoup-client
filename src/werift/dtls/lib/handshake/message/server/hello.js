"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerHello = void 0;
const binary_data_1 = require("binary-data");
const const_1 = require("../../const");
const binary_1 = require("../../binary");
const random_1 = require("../../random");
const fragment_1 = require("../../../record/message/fragment");
// 7.4.1.3.  Server Hello
class ServerHello {
    constructor(serverVersion, random, sessionId, cipherSuite, compressionMethod, extensions) {
        this.serverVersion = serverVersion;
        this.random = random;
        this.sessionId = sessionId;
        this.cipherSuite = cipherSuite;
        this.compressionMethod = compressionMethod;
        this.extensions = extensions;
        this.msgType = const_1.HandshakeType.server_hello;
    }
    static createEmpty() {
        return new ServerHello(undefined, undefined, undefined, undefined, undefined, undefined);
    }
    static deSerialize(buf) {
        const res = binary_data_1.decode(buf, ServerHello.spec);
        const cls = new ServerHello(
        //@ts-ignore
        ...Object.values(res));
        const expect = cls.serialize();
        if (expect.length < buf.length) {
            return new ServerHello(
            //@ts-ignore
            ...Object.values(binary_data_1.decode(buf, { ...ServerHello.spec, extensions: binary_1.ExtensionList })));
        }
        return cls;
    }
    serialize() {
        const res = this.extensions === undefined
            ? binary_data_1.encode(this, ServerHello.spec).slice()
            : binary_data_1.encode(this, {
                ...ServerHello.spec,
                extensions: binary_1.ExtensionList,
            }).slice();
        return Buffer.from(res);
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.ServerHello = ServerHello;
ServerHello.spec = {
    serverVersion: binary_1.ProtocolVersion,
    random: random_1.DtlsRandom.spec,
    sessionId: binary_data_1.types.buffer(binary_data_1.types.uint8),
    cipherSuite: binary_data_1.types.uint16be,
    compressionMethod: binary_data_1.types.uint8,
};
//# sourceMappingURL=hello.js.map