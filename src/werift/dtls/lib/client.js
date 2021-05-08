"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DtlsClient = void 0;
const tslib_1 = require("tslib");
const flight1_1 = require("./flight/client/flight1");
const helloVerifyRequest_1 = require("./handshake/message/server/helloVerifyRequest");
const flight3_1 = require("./flight/client/flight3");
const const_1 = require("./handshake/const");
const flight5_1 = require("./flight/client/flight5");
const abstract_1 = require("./cipher/suites/abstract");
const socket_1 = require("./socket");
const debug_1 = tslib_1.__importDefault(require("debug"));
const log = debug_1.default("werift/dtls/client");
class DtlsClient extends socket_1.DtlsSocket {
    constructor(options) {
        super(options, abstract_1.SessionType.CLIENT);
        this.handleHandshakes = (assembled) => {
            log("handleHandshakes", assembled);
            for (const handshake of assembled) {
                switch (handshake.msg_type) {
                    case const_1.HandshakeType.hello_verify_request:
                        {
                            const verifyReq = helloVerifyRequest_1.ServerHelloVerifyRequest.deSerialize(handshake.fragment);
                            new flight3_1.Flight3(this.transport, this.dtls).exec(verifyReq);
                        }
                        break;
                    case const_1.HandshakeType.server_hello:
                        {
                            this.flight5 = new flight5_1.Flight5(this.transport, this.dtls, this.cipher, this.srtp);
                            this.flight5.handleHandshake(handshake);
                        }
                        break;
                    case const_1.HandshakeType.certificate:
                    case const_1.HandshakeType.server_key_exchange:
                    case const_1.HandshakeType.certificate_request:
                        {
                            this.flight5.handleHandshake(handshake);
                        }
                        break;
                    case const_1.HandshakeType.server_hello_done:
                        {
                            this.flight5.handleHandshake(handshake);
                            this.flight5.exec();
                        }
                        break;
                    case const_1.HandshakeType.finished:
                        {
                            this.dtls.flight = 7;
                            this.onConnect.execute();
                            log("dtls connected");
                        }
                        break;
                }
            }
        };
        this.onHandleHandshakes = this.handleHandshakes;
        log("start client", options);
    }
    connect() {
        new flight1_1.Flight1(this.transport, this.dtls, this.cipher).exec(this.extensions);
    }
}
exports.DtlsClient = DtlsClient;
//# sourceMappingURL=client.js.map