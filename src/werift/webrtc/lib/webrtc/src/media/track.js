"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaStreamTrack = void 0;
const tslib_1 = require("tslib");
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
const uuid_1 = require("uuid");
const src_1 = require("../../../rtp/src");
const helper_1 = require("../helper");
class MediaStreamTrack extends helper_1.EventTarget {
    constructor(props) {
        super();
        this.remote = false;
        this.id = uuid_1.v4();
        this.onReceiveRtp = new rx_mini_1.default();
        this.stopped = false;
        this.muted = true;
        this.stop = () => {
            this.stopped = true;
            this.muted = true;
            this.onReceiveRtp.complete();
        };
        this.writeRtp = (rtp) => {
            if (this.remote)
                throw new Error("this is remoteTrack");
            if (!this.codec || this.stopped)
                return;
            const packet = Buffer.isBuffer(rtp) ? src_1.RtpPacket.deSerialize(rtp) : rtp;
            packet.header.payloadType = this.codec.payloadType;
            this.onReceiveRtp.execute(packet);
        };
        Object.assign(this, props);
        this.onReceiveRtp.subscribe((rtp) => {
            this.muted = false;
            this.header = rtp.header;
        });
        this.label = `${this.remote ? "remote" : "local"} ${this.kind}`;
    }
}
exports.MediaStreamTrack = MediaStreamTrack;
//# sourceMappingURL=track.js.map