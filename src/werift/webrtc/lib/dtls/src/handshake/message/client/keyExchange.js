"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientKeyExchange = void 0;
const binary_data_1 = require("binary-data");
const const_1 = require("../../const");
const fragment_1 = require("../../../record/message/fragment");
class ClientKeyExchange {
    constructor(publicKey) {
        this.publicKey = publicKey;
        this.msgType = const_1.HandshakeType.client_key_exchange;
    }
    static createEmpty() {
        return new ClientKeyExchange(undefined);
    }
    static deSerialize(buf) {
        const res = binary_data_1.decode(buf, ClientKeyExchange.spec);
        return new ClientKeyExchange(
        //@ts-ignore
        ...Object.values(res));
    }
    serialize() {
        const res = binary_data_1.encode(this, ClientKeyExchange.spec).slice();
        return Buffer.from(res);
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.ClientKeyExchange = ClientKeyExchange;
ClientKeyExchange.spec = {
    publicKey: binary_data_1.types.buffer(binary_data_1.types.uint8),
};
//# sourceMappingURL=keyExchange.js.map