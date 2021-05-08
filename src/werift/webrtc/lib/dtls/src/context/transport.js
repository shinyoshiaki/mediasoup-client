"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportContext = void 0;
class TransportContext {
    constructor(socket) {
        this.socket = socket;
        this.send = this.socket.send;
    }
}
exports.TransportContext = TransportContext;
//# sourceMappingURL=transport.js.map