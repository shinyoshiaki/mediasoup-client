"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flight6 = void 0;
const tslib_1 = require("tslib");
const const_1 = require("../../handshake/const");
const prf_1 = require("../../cipher/prf");
const keyExchange_1 = require("../../handshake/message/client/keyExchange");
const changeCipherSpec_1 = require("../../handshake/message/changeCipherSpec");
const finished_1 = require("../../handshake/message/finished");
const builder_1 = require("../../record/builder");
const const_2 = require("../../record/const");
const create_1 = require("../../cipher/create");
const flight_1 = require("../flight");
const debug_1 = tslib_1.__importDefault(require("debug"));
const log = debug_1.default("werift/dtls/flight6");
class Flight6 extends flight_1.Flight {
    constructor(udp, dtls, cipher) {
        super(udp, dtls, 6);
        this.cipher = cipher;
    }
    handleHandshake(handshake) {
        this.dtls.bufferHandshakeCache([handshake], false, 5);
        const message = (() => {
            switch (handshake.msg_type) {
                case const_1.HandshakeType.client_key_exchange:
                    return keyExchange_1.ClientKeyExchange.deSerialize(handshake.fragment);
                case const_1.HandshakeType.finished:
                    return finished_1.Finished.deSerialize(handshake.fragment);
            }
        })();
        if (message) {
            handlers[message.msgType]({ dtls: this.dtls, cipher: this.cipher })(message);
        }
    }
    exec() {
        if (this.dtls.flight === 6) {
            log("flight6 twice");
            this.send(this.dtls.lastMessage);
            return;
        }
        this.dtls.flight = 6;
        const messages = [this.sendChangeCipherSpec(), this.sendFinished()];
        this.dtls.lastMessage = messages;
        this.transmit(messages);
    }
    sendChangeCipherSpec() {
        const changeCipherSpec = changeCipherSpec_1.ChangeCipherSpec.createEmpty().serialize();
        const packets = builder_1.createPlaintext(this.dtls)([{ type: const_2.ContentType.changeCipherSpec, fragment: changeCipherSpec }], ++this.dtls.recordSequenceNumber);
        const buf = Buffer.concat(packets.map((v) => v.serialize()));
        return buf;
    }
    sendFinished() {
        const cache = Buffer.concat(this.dtls.handshakeCache.map((v) => v.data.serialize()));
        const localVerifyData = this.cipher.verifyData(cache);
        const finish = new finished_1.Finished(localVerifyData);
        this.dtls.epoch = 1;
        const [packet] = this.createPacket([finish]);
        this.dtls.recordSequenceNumber = 0;
        const buf = this.cipher.encryptPacket(packet).serialize();
        return buf;
    }
}
exports.Flight6 = Flight6;
const handlers = {};
handlers[const_1.HandshakeType.client_key_exchange] = ({ cipher, dtls }) => (message) => {
    cipher.remoteKeyPair = {
        curve: cipher.namedCurve,
        publicKey: message.publicKey,
    };
    if (!cipher.remoteKeyPair.publicKey ||
        !cipher.localKeyPair ||
        !cipher.remoteRandom ||
        !cipher.localRandom)
        throw new Error();
    const preMasterSecret = prf_1.prfPreMasterSecret(cipher.remoteKeyPair.publicKey, cipher.localKeyPair.privateKey, cipher.localKeyPair.curve);
    log("extendedMasterSecret", dtls.options.extendedMasterSecret, dtls.remoteExtendedMasterSecret);
    const handshakes = Buffer.concat(dtls.handshakeCache.map((v) => v.data.serialize()));
    cipher.masterSecret =
        dtls.options.extendedMasterSecret && dtls.remoteExtendedMasterSecret
            ? prf_1.prfExtendedMasterSecret(preMasterSecret, handshakes)
            : prf_1.prfMasterSecret(preMasterSecret, cipher.remoteRandom.serialize(), cipher.localRandom.serialize());
    cipher.cipher = create_1.createCipher(cipher.cipherSuite);
    cipher.cipher.init(cipher.masterSecret, cipher.localRandom.serialize(), cipher.remoteRandom.serialize());
};
handlers[const_1.HandshakeType.finished] = () => (message) => {
    log("finished", message);
};
//# sourceMappingURL=flight6.js.map