"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertCandidateTypes = exports.inviteAccept = exports.readMessage = void 0;
const tslib_1 = require("tslib");
const assert_1 = require("assert");
const fs_1 = require("fs");
function readMessage(name) {
    const data = fs_1.readFileSync("./tests/data/" + name);
    return data;
}
exports.readMessage = readMessage;
function inviteAccept(a, b) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // # invite
        yield a.gatherCandidates();
        b.remoteCandidates = a.localCandidates;
        b.remoteUsername = a.localUserName;
        b.remotePassword = a.localPassword;
        // # accept
        yield b.gatherCandidates();
        a.remoteCandidates = b.localCandidates;
        a.remoteUsername = b.localUserName;
        a.remotePassword = b.localPassword;
    });
}
exports.inviteAccept = inviteAccept;
function assertCandidateTypes(conn, expected) {
    const types = conn.localCandidates.map((v) => v.type);
    assert_1.deepStrictEqual(new Set(types), new Set(expected));
}
exports.assertCandidateTypes = assertCandidateTypes;
//# sourceMappingURL=utils.js.map