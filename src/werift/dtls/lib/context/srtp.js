"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SrtpContext = void 0;
class SrtpContext {
    static findMatchingSRTPProfile(remote, local) {
        for (const v of remote) {
            if (local.includes(v))
                return v;
        }
    }
}
exports.SrtpContext = SrtpContext;
//# sourceMappingURL=srtp.js.map