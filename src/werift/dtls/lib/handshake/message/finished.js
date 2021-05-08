"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Finished = void 0;
const const_1 = require("../const");
const fragment_1 = require("../../record/message/fragment");
// 7.4.9.  Finished
class Finished {
    constructor(verifyData) {
        this.verifyData = verifyData;
        this.msgType = const_1.HandshakeType.finished;
    }
    static createEmpty() {
        return new Finished(undefined);
    }
    static deSerialize(buf) {
        return new Finished(buf);
    }
    serialize() {
        return this.verifyData;
    }
    toFragment() {
        const body = this.serialize();
        return new fragment_1.FragmentedHandshake(this.msgType, body.length, this.messageSeq, 0, body.length, body);
    }
}
exports.Finished = Finished;
//# sourceMappingURL=finished.js.map