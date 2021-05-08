"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenegotiationIndication = void 0;
const binary_data_1 = require("binary-data");
class RenegotiationIndication {
    constructor(props = {}) {
        this.type = RenegotiationIndication.type;
        this.data = 0;
        Object.assign(this, props);
    }
    static createEmpty() {
        const v = new RenegotiationIndication();
        return v;
    }
    static deSerialize(buf) {
        return new RenegotiationIndication(binary_data_1.decode(buf, RenegotiationIndication.spec));
    }
    serialize() {
        const res = binary_data_1.encode(this, RenegotiationIndication.spec).slice();
        return Buffer.from(res);
    }
    get extension() {
        return {
            type: this.type,
            data: this.serialize().slice(2),
        };
    }
}
exports.RenegotiationIndication = RenegotiationIndication;
RenegotiationIndication.type = 65281;
RenegotiationIndication.spec = {
    type: binary_data_1.types.uint16be,
    data: binary_data_1.types.uint8,
};
//# sourceMappingURL=renegotiationIndication.js.map