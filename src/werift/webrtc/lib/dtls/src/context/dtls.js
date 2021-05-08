"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DtlsContext = void 0;
class DtlsContext {
    constructor(options, sessionType) {
        this.options = options;
        this.sessionType = sessionType;
        this.version = { major: 255 - 1, minor: 255 - 2 };
        this.lastFlight = [];
        this.lastMessage = [];
        this.recordSequenceNumber = 0;
        this.sequenceNumber = 0;
        this.epoch = 0;
        this.flight = 0;
        this.handshakeCache = [];
        this.requestedCertificateTypes = [];
        this.requestedSignatureAlgorithms = [];
        this.remoteExtendedMasterSecret = false;
    }
    bufferHandshakeCache(handshakes, isLocal, flight) {
        this.handshakeCache = [
            ...this.handshakeCache,
            ...handshakes.map((data) => ({
                isLocal,
                data,
                flight,
            })),
        ];
    }
}
exports.DtlsContext = DtlsContext;
//# sourceMappingURL=dtls.js.map