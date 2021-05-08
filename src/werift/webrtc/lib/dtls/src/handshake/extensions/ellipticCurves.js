"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EllipticCurves = void 0;
const binary_data_1 = require("binary-data");
// rfc4492
class EllipticCurves {
    constructor(props = {}) {
        this.type = EllipticCurves.type;
        this.data = [];
        Object.assign(this, props);
    }
    static createEmpty() {
        return new EllipticCurves();
    }
    static fromData(buf) {
        return new EllipticCurves({
            type: EllipticCurves.type,
            data: binary_data_1.decode(buf, EllipticCurves.spec.data),
        });
    }
    static deSerialize(buf) {
        return new EllipticCurves(binary_data_1.decode(buf, EllipticCurves.spec));
    }
    serialize() {
        return Buffer.from(binary_data_1.encode(this, EllipticCurves.spec).slice());
    }
    get extension() {
        return {
            type: this.type,
            data: this.serialize().slice(2),
        };
    }
}
exports.EllipticCurves = EllipticCurves;
EllipticCurves.type = 10;
EllipticCurves.spec = {
    type: binary_data_1.types.uint16be,
    data: binary_data_1.types.array(binary_data_1.types.uint16be, binary_data_1.types.uint16be, "bytes"),
};
//# sourceMappingURL=ellipticCurves.js.map