"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flight = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const helper_1 = require("../helper");
const builder_1 = require("../record/builder");
const const_1 = require("../record/const");
const log = debug_1.default("werift/dtls/flight");
const flightTypes = ["PREPARING", "SENDING", "WAITING", "FINISHED"];
class Flight {
    constructor(transport, dtls, flight, nextFlight) {
        this.transport = transport;
        this.dtls = dtls;
        this.flight = flight;
        this.nextFlight = nextFlight;
        this.state = "PREPARING";
        this.buffer = [];
        this.send = (buf) => Promise.all(buf.map((v) => this.transport.send(v)));
        this.retransmitCount = 0;
    }
    createPacket(handshakes) {
        const fragments = builder_1.createFragments(this.dtls)(handshakes);
        this.dtls.bufferHandshakeCache(fragments, true, this.flight);
        const packets = builder_1.createPlaintext(this.dtls)(fragments.map((fragment) => ({
            type: const_1.ContentType.handshake,
            fragment: fragment.serialize(),
        })), ++this.dtls.recordSequenceNumber);
        return packets;
    }
    transmit(buf) {
        this.buffer = buf;
        this.retransmit();
    }
    setState(state) {
        this.state = state;
    }
    async retransmit() {
        this.setState("SENDING");
        this.send(this.buffer);
        this.setState("WAITING");
        if (this.nextFlight === undefined) {
            this.retransmitCount = 0;
            this.setState("FINISHED");
            return;
        }
        await helper_1.sleep(1000);
        if (this.dtls.flight >= this.nextFlight) {
            this.retransmitCount = 0;
            this.setState("FINISHED");
            return;
        }
        else {
            if (this.retransmitCount++ > 10)
                throw new Error("over retransmitCount");
            log("retransmit", this.dtls.flight, this.dtls.sessionType);
            this.retransmit().then(() => log(this.dtls.flight, "done"));
        }
    }
}
exports.Flight = Flight;
//# sourceMappingURL=flight.js.map