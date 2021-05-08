"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DtlsServer = void 0;
const tslib_1 = require("tslib");
const const_1 = require("./handshake/const");
const hello_1 = require("./handshake/message/client/hello");
const flight2_1 = require("./flight/server/flight2");
const flight4_1 = require("./flight/server/flight4");
const flight6_1 = require("./flight/server/flight6");
const abstract_1 = require("./cipher/suites/abstract");
const socket_1 = require("./socket");
const debug_1 = tslib_1.__importDefault(require("debug"));
const log = debug_1.default("werift/dtls/server");
class DtlsServer extends socket_1.DtlsSocket {
    constructor(options) {
        super(options, abstract_1.SessionType.SERVER);
        this.handleHandshakes = (assembled) => {
            log("handleHandshakes", assembled);
            for (const handshake of assembled) {
                switch (handshake.msg_type) {
                    case const_1.HandshakeType.client_hello:
                        {
                            const clientHello = hello_1.ClientHello.deSerialize(handshake.fragment);
                            if (this.dtls.cookie &&
                                clientHello.cookie.equals(this.dtls.cookie)) {
                                log("send flight4");
                                new flight4_1.Flight4(this.transport, this.dtls, this.cipher, this.srtp).exec(handshake, this.options.certificateRequest);
                            }
                            else if (!this.dtls.cookie) {
                                log("send flight2");
                                flight2_1.flight2(this.transport, this.dtls, this.cipher, this.srtp)(clientHello);
                            }
                        }
                        break;
                    case const_1.HandshakeType.client_key_exchange:
                        {
                            this.flight6 = new flight6_1.Flight6(this.transport, this.dtls, this.cipher);
                            this.flight6.handleHandshake(handshake);
                        }
                        break;
                    case const_1.HandshakeType.finished:
                        {
                            this.flight6.handleHandshake(handshake);
                            this.flight6.exec();
                            this.onConnect.execute();
                            log("dtls connected");
                        }
                        break;
                }
            }
        };
        this.onHandleHandshakes = this.handleHandshakes;
        log("start server", options);
    }
}
exports.DtlsServer = DtlsServer;
//# sourceMappingURL=server.js.map