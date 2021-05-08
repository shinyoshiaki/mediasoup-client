"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RtcpHeader = exports.HEADER_SIZE = void 0;
const helper_1 = require("../helper");
const utils_1 = require("../utils");
exports.HEADER_SIZE = 4;
/*
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |V=2|P|    RC   |      PT       |             length            |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 */
class RtcpHeader {
    constructor(props = {}) {
        this.version = 2;
        this.padding = false;
        this.count = 0;
        this.type = 0;
        this.length = 0;
        Object.assign(this, props);
    }
    serialize() {
        const v_p_rc = new utils_1.BitWriter(8);
        v_p_rc.set(2, 0, this.version);
        if (this.padding)
            v_p_rc.set(1, 2, 1);
        v_p_rc.set(5, 3, this.count);
        const buf = helper_1.bufferWriter([1, 1, 2], [v_p_rc.value, this.type, this.length]);
        return buf;
    }
    static deSerialize(buf) {
        const [v_p_rc, type, length] = helper_1.bufferReader(buf, [1, 1, 2]);
        const version = utils_1.getBit(v_p_rc, 0, 2);
        const padding = utils_1.getBit(v_p_rc, 2, 1) > 0;
        const count = utils_1.getBit(v_p_rc, 3, 5);
        return new RtcpHeader({ version, padding, count, type, length });
    }
}
exports.RtcpHeader = RtcpHeader;
//# sourceMappingURL=header.js.map