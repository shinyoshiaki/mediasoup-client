"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const src_1 = require("../../src");
const utils_1 = require("../utils");
const utils_2 = require("../../src/utils");
describe("IceTrickleTest", () => {
    test("test_trickle_connect", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new src_1.Connection(true);
        const b = new src_1.Connection(false);
        yield a.gatherCandidates();
        b.remoteUsername = a.localUserName;
        b.remotePassword = a.localPassword;
        yield b.gatherCandidates();
        a.remoteUsername = b.localUserName;
        a.remotePassword = b.localPassword;
        utils_1.assertCandidateTypes(a, ["host"]);
        utils_1.assertCandidateTypes(b, ["host"]);
        let candidate = a.getDefaultCandidate(1);
        expect(candidate).not.toBeUndefined();
        expect(candidate.type).toBe("host");
        candidate = a.getDefaultCandidate(2);
        expect(candidate).toBeUndefined();
        const addCandidatesLater = (a, b) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            yield utils_2.sleep(100);
            for (const candidate of b.localCandidates) {
                a.addRemoteCandidate(candidate);
                yield utils_2.sleep(100);
            }
            a.addRemoteCandidate(undefined);
        });
        yield Promise.all([
            a.connect(),
            b.connect(),
            addCandidatesLater(a, b),
            addCandidatesLater(b, a),
        ]);
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
});
//# sourceMappingURL=trickle.test.js.map