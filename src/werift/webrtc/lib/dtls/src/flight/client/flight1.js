"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flight1 = void 0;
const hello_1 = require("../../handshake/message/client/hello");
const random_1 = require("../../handshake/random");
const const_1 = require("../../cipher/const");
const flight_1 = require("../flight");
class Flight1 extends flight_1.Flight {
    constructor(udp, dtls, cipher) {
        super(udp, dtls, 1, 3);
        this.cipher = cipher;
    }
    exec(extensions) {
        if (this.dtls.flight === 1)
            throw new Error();
        this.dtls.flight = 1;
        const hello = new hello_1.ClientHello({ major: 255 - 1, minor: 255 - 2 }, new random_1.DtlsRandom(), Buffer.from([]), Buffer.from([]), Object.values(const_1.CipherSuite), [0], // don't compress
        extensions);
        this.dtls.version = hello.clientVersion;
        this.cipher.localRandom = random_1.DtlsRandom.from(hello.random);
        const packets = this.createPacket([hello]);
        const buf = Buffer.concat(packets.map((v) => v.serialize()));
        this.transmit([buf]);
    }
}
exports.Flight1 = Flight1;
//# sourceMappingURL=flight1.js.map