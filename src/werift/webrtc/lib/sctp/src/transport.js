"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUdpTransport = exports.UdpTransport = void 0;
class UdpTransport {
    constructor(upd, rinfo) {
        this.upd = upd;
        this.rinfo = rinfo;
        this.send = (buf) => new Promise((r) => this.upd.send(buf, this.rinfo.port, this.rinfo.address, () => r()));
        upd.on("message", (buf, target) => {
            this.rinfo = target;
            if (this.onData)
                this.onData(buf);
        });
    }
    close() {
        this.upd.close();
    }
}
exports.UdpTransport = UdpTransport;
const createUdpTransport = (socket, rinfo = {}) => new UdpTransport(socket, rinfo);
exports.createUdpTransport = createUdpTransport;
//# sourceMappingURL=transport.js.map