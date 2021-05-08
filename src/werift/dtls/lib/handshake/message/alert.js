"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alert = void 0;
const binary_data_1 = require("binary-data");
class Alert {
    constructor(level, description) {
        this.level = level;
        this.description = description;
    }
    static deSerialize(buf) {
        return new Alert(
        //@ts-ignore
        ...Object.values(binary_data_1.decode(buf, Alert.spec)));
    }
    serialize() {
        const res = binary_data_1.encode(this, Alert.spec).slice();
        return Buffer.from(res);
    }
}
exports.Alert = Alert;
Alert.spec = {
    level: binary_data_1.types.uint8,
    description: binary_data_1.types.uint8,
};
//# sourceMappingURL=alert.js.map