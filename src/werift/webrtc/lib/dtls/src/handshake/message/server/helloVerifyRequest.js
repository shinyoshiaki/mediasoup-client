"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerHelloVerifyRequest = void 0;
const binary_data_1 = require("binary-data");
const const_1 = require("../../const");
const binary_1 = require("../../binary");
const fragment_1 = require("../../../record/message/fragment");
// 4.2.1.  Denial-of-Service Countermeasures
class ServerHelloVerifyRequest {
    constructor(serverVersion, cookie) {
        this.serverVersion = serverVersion;
        this.cookie = cookie;
        this.msgType = const_1.HandshakeType.hello_verify_request;
    }
    static createEmpty() {
        return new ServerHelloVerifyRequest(undefined, undefined);
    }
    static deSerialize(buf) {
        return new ServerHelloVerifyRequest(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, ServerHelloVerifyRequest.spec)));
    }
    serialize() {
        const res = binary_data_1.encode(this, ServerHelloVerifyRequest.spec).slice();
        return Buffer.from(res);
    }
    get version() {
        return {
            major: 255 - this.serverVersion.major,
            minor: 255 - this.serverVersion.minor,
        };
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.ServerHelloVerifyRequest = ServerHelloVerifyRequest;
ServerHelloVerifyRequest.spec = {
    serverVersion: binary_1.ProtocolVersion,
    cookie: binary_data_1.types.buffer(binary_data_1.types.uint8),
};
//# sourceMappingURL=helloVerifyRequest.js.map