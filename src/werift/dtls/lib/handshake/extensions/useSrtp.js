"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UseSRTP = void 0;
const binary_data_1 = require("binary-data");
const lodash_1 = require("lodash");
class UseSRTP {
    constructor(props = {}) {
        this.type = UseSRTP.type;
        this.data = Buffer.from([]);
        this.profiles = [];
        this.mki = Buffer.from([0x00]);
        Object.assign(this, props);
    }
    static create(profiles, mki) {
        const v = new UseSRTP({
            profiles,
            mki,
        });
        return v;
    }
    static deSerialize(buf) {
        const useSrtp = new UseSRTP(binary_data_1.decode(buf, UseSRTP.spec));
        const profileLength = useSrtp.data.readUInt16BE();
        const profiles = lodash_1.times(profileLength / 2).map((i) => {
            return useSrtp.data.readUInt16BE(i * 2 + 2);
        });
        useSrtp.profiles = profiles;
        useSrtp.mki = useSrtp.data.slice(profileLength + 2);
        return useSrtp;
    }
    serialize() {
        const profileLength = Buffer.alloc(2);
        profileLength.writeUInt16BE(this.profiles.length * 2);
        const data = Buffer.concat([
            profileLength,
            ...this.profiles.map((profile) => {
                const buf = Buffer.alloc(2);
                buf.writeUInt16BE(profile);
                return buf;
            }),
            this.mki,
        ]);
        this.data = data;
        const res = binary_data_1.encode(this, UseSRTP.spec).slice();
        return Buffer.from(res);
    }
    static fromData(buf) {
        const head = Buffer.alloc(4);
        head.writeUInt16BE(UseSRTP.type);
        head.writeUInt16BE(buf.length, 2);
        return UseSRTP.deSerialize(Buffer.concat([head, buf]));
    }
    get extension() {
        return {
            type: this.type,
            data: this.serialize().slice(4),
        };
    }
}
exports.UseSRTP = UseSRTP;
UseSRTP.type = 14; // 9.  IANA Considerations
UseSRTP.spec = {
    type: binary_data_1.types.uint16be,
    data: binary_data_1.types.buffer(binary_data_1.types.uint16be),
};
//# sourceMappingURL=useSrtp.js.map