"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const src_1 = require("../src");
test("example", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const a = new src_1.Connection(true, {
        stunServer: ["stun.l.google.com", 19302],
    });
    const b = new src_1.Connection(false, {
        stunServer: ["stun.l.google.com", 19302],
    });
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
    // # connect
    yield Promise.all([a.connect(), b.connect()]);
    // # send data a -> b
    yield a.send(Buffer.from("howdee"));
    let [data] = yield b.onData.asPromise();
    expect(data.toString()).toBe("howdee");
    // # send data b -> a
    yield b.send(Buffer.from("gotcha"));
    [data] = yield a.onData.asPromise();
    expect(data.toString()).toBe("gotcha");
    yield a.close();
    yield b.close();
}));
//# sourceMappingURL=example.test.js.map