"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
class Session {
    constructor(ContextCls) {
        this.ContextCls = ContextCls;
    }
    start(localMasterKey, localMasterSalt, remoteMasterKey, remoteMasterSalt, profile) {
        this.localContext = new this.ContextCls(localMasterKey, localMasterSalt, profile);
        this.remoteContext = new this.ContextCls(remoteMasterKey, remoteMasterSalt, profile);
    }
}
exports.Session = Session;
//# sourceMappingURL=session.js.map