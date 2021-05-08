"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerHelloDone = void 0;
const binary_data_1 = require("binary-data");
const const_1 = require("../../const");
const fragment_1 = require("../../../record/message/fragment");
// 7.4.5.  Server Hello Done
class ServerHelloDone {
    constructor() {
        this.msgType = const_1.HandshakeType.server_hello_done;
    }
    static createEmpty() {
        return new ServerHelloDone();
    }
    static deSerialize(buf) {
        return new ServerHelloDone(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, ServerHelloDone.spec)));
    }
    serialize() {
        const res = binary_data_1.encode(this, ServerHelloDone.spec).slice();
        return Buffer.from(res);
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.ServerHelloDone = ServerHelloDone;
ServerHelloDone.spec = {};
//# sourceMappingURL=helloDone.js.map