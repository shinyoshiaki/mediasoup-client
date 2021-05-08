"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PictureLossIndication = void 0;
const helper_1 = require("../../helper");
class PictureLossIndication {
    constructor(props = {}) {
        this.count = PictureLossIndication.count;
        this.length = 2;
        Object.assign(this, props);
    }
    static deSerialize(data) {
        const [senderSsrc, mediaSsrc] = helper_1.bufferReader(data, [4, 4]);
        return new PictureLossIndication({ senderSsrc, mediaSsrc });
    }
    serialize() {
        return helper_1.bufferWriter([4, 4], [this.senderSsrc, this.mediaSsrc]);
    }
}
exports.PictureLossIndication = PictureLossIndication;
PictureLossIndication.count = 1;
//# sourceMappingURL=pictureLossIndication.js.map