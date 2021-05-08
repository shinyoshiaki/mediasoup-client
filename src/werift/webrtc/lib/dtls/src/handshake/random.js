"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DtlsRandom = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
const binary_data_1 = require("binary-data");
const crypto_1 = require("crypto");
class DtlsRandom {
    constructor(gmt_unix_time = Math.floor(Date.now() / 1000), random_bytes = crypto_1.randomBytes(28)) {
        this.gmt_unix_time = gmt_unix_time;
        this.random_bytes = random_bytes;
    }
    static deSerialize(buf) {
        return new DtlsRandom(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, DtlsRandom.spec)));
    }
    static from(spec) {
        //@ts-ignore
        return new DtlsRandom(...Object.values(spec));
    }
    serialize() {
        const res = binary_data_1.encode(this, DtlsRandom.spec).slice();
        return Buffer.from(res);
    }
}
exports.DtlsRandom = DtlsRandom;
DtlsRandom.spec = {
    gmt_unix_time: binary_data_1.types.uint32be,
    random_bytes: binary_data_1.types.buffer(28),
};
//# sourceMappingURL=random.js.map