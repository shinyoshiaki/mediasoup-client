"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ice_1 = require("../../src/ice");
const candidate_1 = require("../../src/candidate");
const utils_1 = require("../utils");
const utils_2 = require("../../src/utils");
const message_1 = require("../../src/stun/message");
const const_1 = require("../../src/stun/const");
class ProtocolMock {
    constructor() {
        this.type = "mock";
        this.localCandidate = new candidate_1.Candidate("some-foundation", 1, "udp", 1234, "1.2.3.4", 1234, "host");
        this.request = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return null;
        });
        this.sendStun = (message) => {
            this.sentMessage = message;
        };
    }
    connectionMade() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { });
    }
    sendData() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { });
    }
}
describe("ice", () => {
    test("test_peer_reflexive", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const connection = new ice_1.Connection(true);
        connection.remotePassword = "remote-password";
        connection.remoteUsername = "remote-username";
        const protocol = new ProtocolMock();
        const request = new message_1.Message(const_1.methods.BINDING, const_1.classes.REQUEST);
        request.attributes["PRIORITY"] = 456789;
        connection.checkIncoming(request, ["2.3.4.5", 2345], protocol);
        expect(protocol.sentMessage).not.toBeNull();
        // # check we have discovered a peer-reflexive candidate
        expect(connection.remoteCandidates.length).toBe(1);
        const candidate = connection.remoteCandidates[0];
        expect(candidate.component).toBe(1);
        expect(candidate.transport).toBe("udp");
        expect(candidate.priority).toBe(456789);
        expect(candidate.host).toBe("2.3.4.5");
        expect(candidate.type).toBe("prflx");
        expect(candidate.generation).toBe(undefined);
        // # check a new pair was formed
        expect(connection.checkList.length).toBe(1);
        const pair = connection.checkList[0];
        expect(pair.protocol).toBe(protocol);
        expect(pair.remoteCandidate).toBe(candidate);
        // # check a triggered check was scheduled
        expect(pair.handle).not.toBeNull();
        protocol.responseAddr = ["2.3.4.5", 2345];
        protocol.responseMessage = "bad";
        yield ((_a = pair.handle) === null || _a === void 0 ? void 0 : _a.promise);
    }));
    test("test_request_with_invalid_method", () => {
        var _a, _b, _c;
        const connection = new ice_1.Connection(true);
        const protocol = new ProtocolMock();
        const request = new message_1.Message(const_1.methods.ALLOCATE, const_1.classes.REQUEST);
        connection.requestReceived(request, ["2.3.4.5", 2345], protocol, request.bytes);
        expect(protocol.sentMessage).not.toBeNull();
        expect((_a = protocol.sentMessage) === null || _a === void 0 ? void 0 : _a.messageMethod).toBe(const_1.methods.ALLOCATE);
        expect((_b = protocol.sentMessage) === null || _b === void 0 ? void 0 : _b.messageClass).toBe(const_1.classes.ERROR);
        expect((_c = protocol.sentMessage) === null || _c === void 0 ? void 0 : _c.attributes["ERROR-CODE"]).toEqual([
            400,
            "Bad Request",
        ]);
    });
    test("test_response_with_invalid_address", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const connection = new ice_1.Connection(true);
        connection.remotePassword = "remote-password";
        connection.remoteUsername = "remote-username";
        const protocol = new ProtocolMock();
        protocol.responseAddr = ["3.4.5.6", 3456];
        protocol.responseMessage = "bad";
        const pair = new ice_1.CandidatePair(protocol, new candidate_1.Candidate("some-foundation", 1, "udp", 2345, "2.3.4.5", 2345, "host"));
        yield connection.checkStart(pair);
        expect(pair.state).toBe(ice_1.CandidatePairState.FAILED);
    }));
    test("test_connect", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true, {});
        const b = new ice_1.Connection(false, {});
        yield utils_1.inviteAccept(a, b);
        utils_1.assertCandidateTypes(a, ["host"]);
        utils_1.assertCandidateTypes(b, ["host"]);
        let candidate = a.getDefaultCandidate(1);
        expect(candidate).not.toBeUndefined();
        expect(candidate === null || candidate === void 0 ? void 0 : candidate.type).toBe("host");
        candidate = a.getDefaultCandidate(2);
        expect(candidate).toBeUndefined();
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
    test("test_connect_close", (done) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true, {});
        const b = new ice_1.Connection(false, {});
        yield utils_1.inviteAccept(a, b);
        yield b.close();
        try {
            yield Promise.all([
                a.connect(),
                () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
                    yield utils_2.sleep(1000);
                    yield a.close();
                }),
            ]);
        }
        catch (error) {
            expect(true).toBe(true);
            done();
        }
    }), 1000 * 10);
    // test("test_connect_two_components", async () => {
    //   const a = new Connection(true, { components: 2 });
    //   const b = new Connection(false, { components: 2 });
    //   // # invite / accept
    //   await inviteAccept(a, b);
    //   // # we should only have host candidates
    //   assertCandidateTypes(a, ["host"]);
    //   assertCandidateTypes(b, ["host"]);
    //   // # there should be a default candidate for component 1
    //   let candidate = a.getDefaultCandidate(1);
    //   expect(candidate).not.toBeUndefined();
    //   expect(candidate?.type).toBe("host");
    //   // # there should be a default candidate for component 2
    //   candidate = a.getDefaultCandidate(2);
    //   expect(candidate).not.toBeUndefined();
    //   expect(candidate?.type).toBe("host");
    //   // # connect
    //   await Promise.all([a.connect(), b.connect()]);
    //   expect(a._components).toEqual(new Set([1, 2]));
    //   expect(b._components).toEqual(new Set([1, 2]));
    //   // # send data a -> b (component 1)
    //   await a.sendTo(Buffer.from("howdee"), 1);
    //   let [data, component] = await b.onData.asPromise();
    //   expect(data).toEqual(Buffer.from("howdee"));
    //   expect(component).toBe(1);
    //   // # send data b -> a (component 1)
    //   await b.sendTo(Buffer.from("gotcha"), 1);
    //   [data, component] = await a.onData.asPromise();
    //   expect(data).toEqual(Buffer.from("gotcha"));
    //   expect(component).toBe(1);
    //   // # send data a -> b (component 2)
    //   await a.sendTo(Buffer.from("howdee 2"), 2);
    //   [data, component] = await b.onData.asPromise();
    //   expect(data.toString()).toEqual(Buffer.from("howdee 2").toString());
    //   expect(component).toBe(2);
    //   // # send data b -> a (component 2)
    //   await b.sendTo(Buffer.from("gotcha 2"), 2);
    //   [data, component] = await a.onData.asPromise();
    //   expect(data.toString()).toEqual(Buffer.from("gotcha 2").toString());
    //   expect(component).toBe(2);
    //   await a.close();
    //   await b.close();
    // });
    // test("test_connect_two_components_vs_one_component", async () => {
    //   // """
    //   // It is possible that some of the local candidates won't get paired with
    //   // remote candidates, and some of the remote candidates won't get paired
    //   // with local candidates.  This can happen if one agent doesn't include
    //   // candidates for the all of the components for a media stream.  If this
    //   // happens, the number of components for that media stream is effectively
    //   // reduced, and considered to be equal to the minimum across both agents
    //   // of the maximum component ID provided by each agent across all
    //   // components for the media stream.
    //   // """
    //   const a = new Connection(true, { components: 2 });
    //   const b = new Connection(false, { components: 1 });
    //   // # invite / accept
    //   await inviteAccept(a, b);
    //   expect(a.localCandidates.length > 0).toBeTruthy();
    //   assertCandidateTypes(a, ["host"]);
    //   // # connect
    //   await Promise.all([a.connect(), b.connect()]);
    //   expect(a._components).toEqual(new Set([1]));
    //   expect(b._components).toEqual(new Set([1]));
    //   // # send data a -> b (component 1)
    //   await a.sendTo(Buffer.from("howdee"), 1);
    //   let [data, component] = await b.onData.asPromise();
    //   expect(data).toEqual(Buffer.from("howdee"));
    //   expect(component).toBe(1);
    //   // # send data b -> a (component 1)
    //   await b.sendTo(Buffer.from("gotcha"), 1);
    //   [data, component] = await a.onData.asPromise();
    //   expect(data).toEqual(Buffer.from("gotcha"));
    //   expect(component).toBe(1);
    //   // # close
    //   await a.close();
    //   await b.close();
    // });
    test("test_connect_ipv6", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true, { useIpv4: false, useIpv6: true });
        const b = new ice_1.Connection(false, { useIpv4: false, useIpv6: true });
        // # invite / accept
        yield utils_1.inviteAccept(a, b);
        utils_1.assertCandidateTypes(a, ["host"]);
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
    test("test_connect_reverse_order", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true);
        const b = new ice_1.Connection(false);
        // # invite / accept
        yield utils_1.inviteAccept(a, b);
        // # introduce a delay so that B's checks complete before A's
        yield Promise.all([
            new Promise((r) => setTimeout(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
                yield a.connect();
                r();
            }), 1000)),
            b.connect(),
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
    test("test_connect_invalid_password", (done) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true);
        const b = new ice_1.Connection(false);
        yield a.gatherCandidates();
        b.remoteCandidates = a.localCandidates;
        b.remoteUsername = a.localUserName;
        b.remotePassword = a.remotePassword;
        yield b.gatherCandidates();
        a.remoteCandidates = b.localCandidates;
        a.remoteUsername = b.localUserName;
        a.remotePassword = "wrong-password";
        try {
            yield Promise.all([a.connect(), b.connect()]);
        }
        catch (error) {
            expect(error.message).toBe("Remote username or password is missing");
            yield a.close();
            yield b.close();
            done();
        }
    }));
    test("test_connect_invalid_username", (done) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true);
        const b = new ice_1.Connection(false);
        yield a.gatherCandidates();
        b.remoteCandidates = a.localCandidates;
        b.remoteUsername = a.localUserName;
        b.remotePassword = a.remotePassword;
        yield b.gatherCandidates();
        a.remoteCandidates = b.localCandidates;
        a.remoteUsername = "wrong-username";
        a.remotePassword = b.localPassword;
        try {
            yield Promise.all([a.connect(), b.connect()]);
        }
        catch (error) {
            expect(error.message).toBe("Remote username or password is missing");
            yield a.close();
            yield b.close();
            done();
        }
    }));
    test("test_connect_no_gather", (done) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        // """
        // If local candidates gathering was not performed, connect fails.
        // """
        const conn = new ice_1.Connection(true);
        conn.remoteCandidates = [
            candidate_1.Candidate.fromSdp("6815297761 1 udp 659136 1.2.3.4 31102 typ host generation 0"),
        ];
        conn.remoteUsername = "foo";
        conn.remotePassword = "bar";
        try {
            yield conn.connect();
        }
        catch (error) {
            expect(error.message).toBe("Local candidates gathering was not performed");
            yield conn.close();
            done();
        }
    }));
    test("test_connect_no_local_candidates", (done) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const conn = new ice_1.Connection(true);
        conn._localCandidatesEnd = true;
        conn.remoteCandidates = [
            candidate_1.Candidate.fromSdp("6815297761 1 udp 659136 1.2.3.4 31102 typ host generation 0"),
        ];
        conn.remoteUsername = "foo";
        conn.remotePassword = "bar";
        try {
            yield conn.connect();
        }
        catch (error) {
            expect(error.message).toBe("ICE negotiation failed");
            yield conn.close();
            done();
        }
    }));
    test("test_connect_no_remote_candidates", (done) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const conn = new ice_1.Connection(true);
        yield conn.gatherCandidates();
        conn.remoteCandidates = [];
        conn.remoteUsername = "foo";
        conn.remotePassword = "bar";
        try {
            yield conn.connect();
        }
        catch (error) {
            expect(error.message).toBe("ICE negotiation failed");
            yield conn.close();
            done();
        }
    }));
    test("test_connect_no_remote_credentials", (done) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const conn = new ice_1.Connection(true);
        yield conn.gatherCandidates();
        conn.remoteCandidates = [
            candidate_1.Candidate.fromSdp("6815297761 1 udp 659136 1.2.3.4 31102 typ host generation 0"),
        ];
        try {
            yield conn.connect();
        }
        catch (error) {
            expect(error.message).toBe("Remote username or password is missing");
            yield conn.close();
            done();
        }
    }));
    test("test_connect_role_conflict_both_controlling", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true);
        const b = new ice_1.Connection(true);
        a._tieBreaker = BigInt(1);
        b._tieBreaker = BigInt(2);
        yield utils_1.inviteAccept(a, b);
        try {
            yield Promise.all([a.connect(), b.connect()]);
        }
        catch (error) { }
        expect(a.iceControlling).toBe(false);
        expect(b.iceControlling).toBe(true);
        yield a.close();
        yield b.close();
    }), 1000 * 60 * 60);
    test("test_connect_role_conflict_both_controlled", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(false);
        const b = new ice_1.Connection(false);
        a._tieBreaker = BigInt(1);
        b._tieBreaker = BigInt(2);
        yield utils_1.inviteAccept(a, b);
        yield Promise.all([a.connect(), b.connect()]);
        expect(a.iceControlling).toBe(false);
        expect(b.iceControlling).toBe(true);
        yield a.close();
        yield b.close();
    }), 1000 * 60 * 60);
    test("test_connect_with_stun_server", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true, {
            stunServer: ["stun.l.google.com", 19302],
        });
        const b = new ice_1.Connection(false, {
            stunServer: ["stun.l.google.com", 19302],
        });
        // # invite / accept
        yield utils_1.inviteAccept(a, b);
        // # we would have both host and server-reflexive candidates
        utils_1.assertCandidateTypes(a, ["host", "srflx"]);
        utils_1.assertCandidateTypes(b, ["host", "srflx"]);
        const candidate = a.getDefaultCandidate(1);
        expect(candidate).not.toBeUndefined();
        expect(candidate.type).toBe("srflx");
        expect(candidate.relatedAddress).not.toBeUndefined();
        expect(candidate.relatedPort).not.toBeUndefined();
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
    test("test_connect_with_stun_server_dns_lookup_error", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true, {
            stunServer: ["invalid", 19302],
        });
        const b = new ice_1.Connection(false, {});
        // # invite / accept
        yield utils_1.inviteAccept(a, b);
        utils_1.assertCandidateTypes(a, ["host"]);
        utils_1.assertCandidateTypes(b, ["host"]);
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
    }), 1000 * 60);
    test("test_connect_with_stun_server_ipv6", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true, {
            stunServer: ["stun.l.google.com", 19302],
            useIpv4: false,
            useIpv6: true,
        });
        const b = new ice_1.Connection(false, {
            stunServer: ["stun.l.google.com", 19302],
            useIpv4: false,
            useIpv6: true,
        });
        // # invite / accept
        yield utils_1.inviteAccept(a, b);
        // # we would have both host and server-reflexive candidates
        expect(a.localCandidates.length > 0).toBeTruthy();
        a.localCandidates.forEach((v) => expect(v.type).toBe("host"));
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
    }), 60 * 1000);
    test("test_connect_to_ice_lite", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const a = new ice_1.Connection(true, {});
        a.remoteIsLite = true;
        const b = new ice_1.Connection(false, {});
        // # invite / accept
        yield utils_1.inviteAccept(a, b);
        // # we would have both host and server-reflexive candidates
        utils_1.assertCandidateTypes(a, ["host"]);
        utils_1.assertCandidateTypes(b, ["host"]);
        const candidate = a.getDefaultCandidate(1);
        expect(candidate).not.toBeUndefined();
        expect(candidate.type).toBe("host");
        expect(a.getDefaultCandidate(2)).toBeUndefined();
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
});
//# sourceMappingURL=ice.test.js.map