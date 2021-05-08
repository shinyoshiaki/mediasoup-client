"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverReflexiveCandidate = exports.getHostAddress = exports.candidatePairPriority = exports.sortCandidatePairs = exports.validateRemoteCandidate = exports.CandidatePair = exports.Connection = exports.CandidatePairState = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const int64_buffer_1 = require("int64-buffer");
const nodeIp = tslib_1.__importStar(require("ip"));
const lodash_1 = require("lodash");
const net_1 = require("net");
const p_cancelable_1 = tslib_1.__importDefault(require("p-cancelable"));
const rx_mini_1 = require("rx.mini");
const candidate_1 = require("./candidate");
const protocol_1 = require("./turn/protocol");
const utils_1 = require("./utils");
const protocol_2 = require("./stun/protocol");
const message_1 = require("./stun/message");
const const_1 = require("./stun/const");
const dns_1 = tslib_1.__importDefault(require("dns"));
const util_1 = tslib_1.__importDefault(require("util"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const log = debug_1.default("werift/ice/ice");
const ICE_COMPLETED = 1;
const ICE_FAILED = 2;
const CONSENT_FAILURES = 6;
const CONSENT_INTERVAL = 5;
var CandidatePairState;
(function (CandidatePairState) {
    CandidatePairState[CandidatePairState["FROZEN"] = 0] = "FROZEN";
    CandidatePairState[CandidatePairState["WAITING"] = 1] = "WAITING";
    CandidatePairState[CandidatePairState["IN_PROGRESS"] = 2] = "IN_PROGRESS";
    CandidatePairState[CandidatePairState["SUCCEEDED"] = 3] = "SUCCEEDED";
    CandidatePairState[CandidatePairState["FAILED"] = 4] = "FAILED";
})(CandidatePairState = exports.CandidatePairState || (exports.CandidatePairState = {}));
const defaultOptions = {
    components: 1,
    useIpv4: true,
    useIpv6: true,
};
class Connection {
    constructor(iceControlling, options) {
        this.iceControlling = iceControlling;
        this.remotePassword = "";
        this.remoteUsername = "";
        this.localUserName = utils_1.randomString(4);
        this.localPassword = utils_1.randomString(22);
        this.remoteIsLite = false;
        this.checkList = [];
        this.localCandidates = [];
        this.remoteCandidatesEnd = false;
        this._localCandidatesEnd = false;
        this._tieBreaker = BigInt(new int64_buffer_1.Uint64BE(crypto_1.randomBytes(64)).toString());
        this.onData = new rx_mini_1.Event();
        this.stateChanged = new rx_mini_1.Event();
        this._remoteCandidates = [];
        // P2P接続完了したソケット
        this.nominated = {};
        this.nominating = new Set();
        this.checkListDone = false;
        this.checkListState = new utils_1.PQueue();
        this.earlyChecks = [];
        this.localCandidatesStart = false;
        this.protocols = [];
        // 4.1.1.4 ? 生存確認 life check
        this.queryConsent = () => new p_cancelable_1.default((r, f, onCancel) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            let failures = 0;
            onCancel(() => {
                failures += CONSENT_FAILURES;
                f("cancel");
            });
            // """
            // Periodically check consent (RFC 7675).
            // """
            while (!this.remoteIsLite) {
                // # randomize between 0.8 and 1.2 times CONSENT_INTERVAL
                yield utils_1.sleep(CONSENT_INTERVAL * (0.8 + 0.4 * Math.random()) * 1000);
                for (const key of this.nominatedKeys) {
                    const pair = this.nominated[Number(key)];
                    const request = this.buildRequest(pair, false);
                    try {
                        const [msg, addr] = yield pair.protocol.request(request, pair.remoteAddr, Buffer.from(this.remotePassword, "utf8"), 0);
                        failures = 0;
                    }
                    catch (error) {
                        failures++;
                        this.stateChanged.execute("disconnected");
                    }
                    if (failures >= CONSENT_FAILURES) {
                        log("Consent to send expired");
                        this.queryConsentHandle = undefined;
                        // 切断検知
                        r(yield this.close());
                        return;
                    }
                }
            }
        }));
        this.send = (data) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            // """
            // Send a datagram on the first component.
            // If the connection is not established, a `ConnectionError` is raised.
            // :param data: The data to be sent.
            // """
            yield this.sendTo(data, 1);
        });
        // 3.  Terminology : Check
        this.checkStart = (pair) => new p_cancelable_1.default((r, f, onCancel) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            var _a;
            onCancel(() => f("cancel"));
            // """
            // Starts a check.
            // """
            log("check start", pair.remoteCandidate);
            this.checkState(pair, CandidatePairState.IN_PROGRESS);
            const nominate = this.iceControlling && !this.remoteIsLite;
            const request = this.buildRequest(pair, nominate);
            const result = {};
            try {
                const [response, addr] = yield pair.protocol.request(request, pair.remoteAddr, Buffer.from(this.remotePassword, "utf8"));
                log("response", response, addr);
                result.response = response;
                result.addr = addr;
            }
            catch (error) {
                const exc = error;
                // 7.1.3.1.  Failure Cases
                log("failure case", exc.response);
                if (((_a = exc.response) === null || _a === void 0 ? void 0 : _a.attributes["ERROR-CODE"][0]) === 487) {
                    if (request.attributesKeys.includes("ICE-CONTROLLED")) {
                        this.switchRole(true);
                    }
                    else if (request.attributesKeys.includes("ICE-CONTROLLING")) {
                        this.switchRole(false);
                    }
                    yield this.checkStart(pair);
                    r();
                    return;
                }
                else {
                    log("CandidatePairState.FAILED");
                    this.checkState(pair, CandidatePairState.FAILED);
                    this.checkComplete(pair);
                    r();
                    return;
                }
            }
            // # check remote address matches
            if (!lodash_1.isEqual(result.addr, pair.remoteAddr)) {
                this.checkState(pair, CandidatePairState.FAILED);
                this.checkComplete(pair);
                r();
                return;
            }
            // # success
            if (nominate || pair.remoteNominated) {
                // # nominated by agressive nomination or the remote party
                pair.nominated = true;
            }
            else if (this.iceControlling && !this.nominating.has(pair.component)) {
                // # perform regular nomination
                this.nominating.add(pair.component);
                const request = this.buildRequest(pair, true);
                try {
                    yield pair.protocol.request(request, pair.remoteAddr, Buffer.from(this.remotePassword, "utf8"));
                }
                catch (error) {
                    this.checkState(pair, CandidatePairState.FAILED);
                    this.checkComplete(pair);
                    return;
                }
                pair.nominated = true;
            }
            this.checkState(pair, CandidatePairState.SUCCEEDED);
            this.checkComplete(pair);
            r();
        }));
        this.pairRemoteCandidate = (remoteCandidate) => {
            var _a;
            for (const protocol of this.protocols) {
                if (((_a = protocol.localCandidate) === null || _a === void 0 ? void 0 : _a.canPairWith(remoteCandidate)) &&
                    !this.findPair(protocol, remoteCandidate)) {
                    const pair = new CandidatePair(protocol, remoteCandidate);
                    this.checkList.push(pair);
                }
            }
        };
        this.options = Object.assign(Object.assign({}, defaultOptions), options);
        const { components, stunServer, turnServer, useIpv4, useIpv6, } = this.options;
        this.stunServer = validateAddress(stunServer);
        this.turnServer = validateAddress(turnServer);
        this.useIpv4 = useIpv4;
        this.useIpv6 = useIpv6;
        this._components = new Set(lodash_1.range(1, components + 1));
    }
    get nominatedKeys() {
        return Object.keys(this.nominated).map((v) => v.toString());
    }
    get remoteAddr() {
        return Object.values(this.nominated)[0].remoteAddr;
    }
    // 4.1.1 Gathering Candidates
    gatherCandidates(cb) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.localCandidatesStart) {
                this.localCandidatesStart = true;
                this.promiseGatherCandidates = new rx_mini_1.Event();
                const address = getHostAddress(this.useIpv4, this.useIpv6);
                for (const component of this._components) {
                    const candidates = yield this.getComponentCandidates(component, address, 5, cb);
                    this.localCandidates = [...this.localCandidates, ...candidates];
                }
                this._localCandidatesEnd = true;
                this.promiseGatherCandidates.execute();
            }
        });
    }
    getComponentCandidates(component, addresses, timeout = 5, cb) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let candidates = [];
            for (const address of addresses) {
                // # create transport
                const protocol = new protocol_2.StunProtocol(this);
                yield protocol.connectionMade(net_1.isIPv4(address));
                protocol.localAddress = address;
                this.protocols.push(protocol);
                // # add host candidate
                const candidateAddress = [address, protocol.getExtraInfo[1]];
                protocol.localCandidate = new candidate_1.Candidate(candidate_1.candidateFoundation("host", "udp", candidateAddress[0]), component, "udp", candidate_1.candidatePriority(component, "host"), candidateAddress[0], candidateAddress[1], "host");
                candidates.push(protocol.localCandidate);
                if (cb)
                    cb(protocol.localCandidate);
            }
            // # query STUN server for server-reflexive candidates (IPv4 only)
            const stunServer = this.stunServer;
            if (stunServer) {
                try {
                    const srflxCandidates = (yield Promise.all(this.protocols.map((protocol) => new Promise((r, f) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                        var _a, _b;
                        setTimeout(f, timeout * 1000);
                        if (((_a = protocol.localCandidate) === null || _a === void 0 ? void 0 : _a.host) &&
                            net_1.isIPv4((_b = protocol.localCandidate) === null || _b === void 0 ? void 0 : _b.host)) {
                            const candidate = yield serverReflexiveCandidate(protocol, stunServer).catch((error) => log("error", error));
                            if (candidate && cb)
                                cb(candidate);
                            r(candidate);
                        }
                        else {
                            r();
                        }
                    }))))).filter((v) => v);
                    candidates = [...candidates, ...srflxCandidates];
                }
                catch (error) {
                    log("query STUN server", error);
                }
            }
            if (this.turnServer &&
                this.options.turnUsername &&
                this.options.turnPassword) {
                const protocol = yield protocol_1.createTurnEndpoint(this.turnServer, this.options.turnUsername, this.options.turnPassword);
                this.protocols.push(protocol);
                const candidateAddress = protocol.turn.relayedAddress;
                const relatedAddress = protocol.turn.mappedAddress;
                log("turn candidateAddress", candidateAddress);
                protocol.localCandidate = new candidate_1.Candidate(candidate_1.candidateFoundation("relay", "udp", candidateAddress[0]), component, "udp", candidate_1.candidatePriority(component, "relay"), candidateAddress[0], candidateAddress[1], "relay", relatedAddress[0], relatedAddress[1]);
                protocol.receiver = this;
                if (this.options.forceTurn) {
                    candidates = [];
                }
                candidates.push(protocol.localCandidate);
            }
            return candidates;
        });
    }
    connect() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // """
            // Perform ICE handshake.
            //
            // This coroutine returns if a candidate pair was successfully nominated
            // and raises an exception otherwise.
            // """
            log("start connect ice");
            if (!this._localCandidatesEnd) {
                if (!this.localCandidatesStart)
                    throw new Error("Local candidates gathering was not performed");
                if (this.promiseGatherCandidates)
                    // wait for GatherCandidates finish
                    yield this.promiseGatherCandidates.asPromise();
            }
            if (!this.remoteUsername || !this.remotePassword)
                throw new Error("Remote username or password is missing");
            // # 5.7.1. Forming Candidate Pairs
            this.remoteCandidates.forEach(this.pairRemoteCandidate);
            this.sortCheckList();
            this.unfreezeInitial();
            // # handle early checks
            this.earlyChecks.forEach((earlyCheck) => this.checkIncoming(...earlyCheck));
            this.earlyChecks = [];
            // # perform checks
            // 5.8.  Scheduling Checks
            for (;;) {
                if (!this.schedulingChecks())
                    break;
                yield utils_1.sleep(20);
            }
            // # wait for completion
            const res = this.checkList.length > 0 ? yield this.checkListState.get() : ICE_FAILED;
            // # cancel remaining checks
            this.checkList.forEach((check) => { var _a; return (_a = check.handle) === null || _a === void 0 ? void 0 : _a.cancel(); });
            if (res !== ICE_COMPLETED) {
                throw new Error("ICE negotiation failed");
            }
            // # start consent freshness tests
            this.queryConsentHandle = utils_1.future(this.queryConsent());
            this.stateChanged.execute("completed");
        });
    }
    unfreezeInitial() {
        // # unfreeze first pair for the first component
        const firstPair = this.checkList.find((pair) => pair.component === Math.min(...[...this._components]));
        if (!firstPair)
            return;
        if (firstPair.state === CandidatePairState.FROZEN) {
            this.checkState(firstPair, CandidatePairState.WAITING);
        }
        // # unfreeze pairs with same component but different foundations
        const seenFoundations = new Set(firstPair.localCandidate.foundation);
        for (const pair of this.checkList) {
            if (pair.component === firstPair.component &&
                !seenFoundations.has(pair.localCandidate.foundation) &&
                pair.state === CandidatePairState.FROZEN) {
                this.checkState(pair, CandidatePairState.WAITING);
                seenFoundations.add(pair.localCandidate.foundation);
            }
        }
    }
    // 5.8 Scheduling Checks
    schedulingChecks() {
        // Ordinary Check
        {
            // # find the highest-priority pair that is in the waiting state
            const pair = this.checkList
                .filter((pair) => {
                if (this.options.forceTurn && pair.protocol.type === "stun")
                    return false;
                return true;
            })
                .find((pair) => pair.state === CandidatePairState.WAITING);
            if (pair) {
                pair.handle = utils_1.future(this.checkStart(pair));
                return true;
            }
        }
        {
            // # find the highest-priority pair that is in the frozen state
            const pair = this.checkList.find((pair) => pair.state === CandidatePairState.FROZEN);
            if (pair) {
                pair.handle = utils_1.future(this.checkStart(pair));
                return true;
            }
        }
        // # if we expect more candidates, keep going
        if (!this.remoteCandidatesEnd) {
            return !this.checkListDone;
        }
        return false;
    }
    close() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // """
            // Close the connection.
            // """
            // # stop consent freshness tests
            if (this.queryConsentHandle && !this.queryConsentHandle.done()) {
                this.queryConsentHandle.cancel();
                try {
                    yield this.queryConsentHandle.promise;
                }
                catch (error) {
                    // pass
                }
            }
            // # stop check list
            if (this.checkList && !this.checkListDone) {
                this.checkListState.put(new Promise((r) => r(ICE_FAILED)));
            }
            this.nominated = {};
            for (const protocol of this.protocols) {
                if (protocol.close)
                    yield protocol.close();
            }
            this.protocols = [];
            this.localCandidates = [];
            this.stateChanged.execute("closed");
        });
    }
    addRemoteCandidate(remoteCandidate) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // """
            // Add a remote candidate or signal end-of-candidates.
            // To signal end-of-candidates, pass `None`.
            // :param remote_candidate: A :class:`Candidate` instance or `None`.
            // """
            if (this.remoteCandidatesEnd)
                throw new Error("Cannot add remote candidate after end-of-candidates.");
            if (!remoteCandidate) {
                this.pruneComponents();
                this.remoteCandidatesEnd = true;
                return;
            }
            if (remoteCandidate.host.includes(".local")) {
                yield utils_1.sleep(10);
                const res = yield util_1.default
                    .promisify(dns_1.default.lookup)(remoteCandidate.host)
                    .catch(() => { });
                if (!res)
                    return;
                remoteCandidate.host = res.address;
            }
            try {
                validateRemoteCandidate(remoteCandidate);
            }
            catch (error) {
                return;
            }
            this.remoteCandidates.push(remoteCandidate);
            this.pairRemoteCandidate(remoteCandidate);
            this.sortCheckList();
        });
    }
    sendTo(data, component) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // """
            // Send a datagram on the specified component.
            // If the connection is not established, a `ConnectionError` is raised.
            // :param data: The data to be sent.
            // :param component: The component on which to send the data.
            // """
            const activePair = this.nominated[component];
            if (activePair) {
                yield activePair.protocol.sendData(data, activePair.remoteAddr);
            }
            else {
                log("Cannot send data, not connected");
            }
        });
    }
    getDefaultCandidate(component) {
        const candidates = this.localCandidates.sort((a, b) => a.priority - b.priority);
        const candidate = candidates.find((candidate) => candidate.component === component);
        return candidate;
    }
    requestReceived(message, addr, protocol, rawData) {
        if (message.messageMethod !== const_1.methods.BINDING) {
            this.respondError(message, addr, protocol, [400, "Bad Request"]);
            return;
        }
        // # authenticate request
        try {
            message_1.parseMessage(rawData, Buffer.from(this.localPassword, "utf8"));
            if (!this.remoteUsername) {
                const rxUsername = `${this.localUserName}:${this.remoteUsername}`;
                if (message.attributes["USERNAME"] != rxUsername)
                    throw new Error("Wrong username");
            }
        }
        catch (error) {
            this.respondError(message, addr, protocol, [400, "Bad Request"]);
            return;
        }
        // 7.2.1.1.  Detecting and Repairing Role Conflicts
        if (this.iceControlling &&
            message.attributesKeys.includes("ICE-CONTROLLING")) {
            if (this._tieBreaker >= message.attributes["ICE-CONTROLLING"]) {
                this.respondError(message, addr, protocol, [487, "Role Conflict"]);
                return;
            }
            else {
                this.switchRole(false);
            }
        }
        else if (!this.iceControlling &&
            message.attributesKeys.includes("ICE-CONTROLLED")) {
            if (this._tieBreaker < message.attributes["ICE-CONTROLLED"]) {
                this.respondError(message, addr, protocol, [487, "Role Conflict"]);
            }
            else {
                this.switchRole(true);
                return;
            }
        }
        // # send binding response
        const response = new message_1.Message(const_1.methods.BINDING, const_1.classes.RESPONSE, message.transactionId);
        response.attributes["XOR-MAPPED-ADDRESS"] = addr;
        response.addMessageIntegrity(Buffer.from(this.localPassword, "utf8"));
        response.addFingerprint();
        protocol.sendStun(response, addr);
        // todo fix
        // if (this.checkList.length === 0) {
        //   this.earlyChecks.push([message, addr, protocol]);
        // } else {
        this.checkIncoming(message, addr, protocol);
        // }
    }
    dataReceived(data, component) {
        this.onData.execute(data, component);
    }
    // for test only
    set remoteCandidates(value) {
        if (this.remoteCandidatesEnd)
            throw new Error("Cannot set remote candidates after end-of-candidates.");
        this._remoteCandidates = [];
        for (const remoteCandidate of value) {
            try {
                validateRemoteCandidate(remoteCandidate);
            }
            catch (error) {
                continue;
            }
            this.remoteCandidates.push(remoteCandidate);
        }
        this.pruneComponents();
        this.remoteCandidatesEnd = true;
    }
    get remoteCandidates() {
        return this._remoteCandidates;
    }
    pruneComponents() {
        const seenComponents = new Set(this.remoteCandidates.map((v) => v.component));
        const missingComponents = [...utils_1.difference(this._components, seenComponents)];
        if (missingComponents.length > 0) {
            this._components = seenComponents;
        }
    }
    sortCheckList() {
        sortCandidatePairs(this.checkList, this.iceControlling);
    }
    findPair(protocol, remoteCandidate) {
        const pair = this.checkList.find((pair) => lodash_1.isEqual(pair.protocol, protocol) &&
            lodash_1.isEqual(pair.remoteCandidate, remoteCandidate));
        return pair;
    }
    checkState(pair, state) {
        pair.state = state;
    }
    switchRole(iceControlling) {
        log("switch role", iceControlling);
        this.iceControlling = iceControlling;
        this.sortCheckList();
    }
    checkComplete(pair) {
        pair.handle = undefined;
        if (pair.state === CandidatePairState.SUCCEEDED) {
            if (pair.nominated) {
                this.nominated[pair.component] = pair;
                // 8.1.2.  Updating States
                // The agent MUST remove all Waiting and Frozen pairs in the check
                // list and triggered check queue for the same component as the
                // nominated pairs for that media stream.
                for (const p of this.checkList) {
                    if (p.component === pair.component &&
                        [CandidatePairState.WAITING, CandidatePairState.FROZEN].includes(p.state)) {
                        this.checkState(p, CandidatePairState.FAILED);
                    }
                }
            }
            // Once there is at least one nominated pair in the valid list for
            // every component of at least one media stream and the state of the
            // check list is Running:
            if (this.nominatedKeys.length === this._components.size) {
                if (!this.checkListDone) {
                    log("ICE completed");
                    this.checkListState.put(new Promise((r) => r(ICE_COMPLETED)));
                    this.checkListDone = true;
                }
                return;
            }
            // 7.1.3.2.3.  Updating Pair States
            for (const p of this.checkList) {
                if (p.localCandidate.foundation === pair.localCandidate.foundation &&
                    p.state === CandidatePairState.FROZEN) {
                    this.checkState(p, CandidatePairState.WAITING);
                }
            }
        }
        {
            const list = [CandidatePairState.SUCCEEDED, CandidatePairState.FAILED];
            if (this.checkList.find(({ state }) => !list.includes(state))) {
                return;
            }
        }
        if (!this.iceControlling) {
            const target = CandidatePairState.SUCCEEDED;
            if (this.checkList.find(({ state }) => state === target)) {
                return;
            }
        }
        if (!this.checkListDone) {
            log("ICE failed");
            this.checkListState.put(new Promise((r) => r(ICE_FAILED)));
            this.checkListDone = true;
        }
    }
    // 7.2.  STUN Server Procedures
    // 7.2.1.3、7.2.1.4、および7.2.1.5
    checkIncoming(message, addr, protocol) {
        var _a;
        // """
        // Handle a successful incoming check.
        // """
        const component = (_a = protocol.localCandidate) === null || _a === void 0 ? void 0 : _a.component;
        if (component == undefined)
            throw new Error();
        // find remote candidate
        let remoteCandidate;
        const [host, port] = addr;
        for (const c of this.remoteCandidates) {
            if (c.host === host && c.port === port) {
                remoteCandidate = c;
                if (remoteCandidate.component !== component)
                    throw new Error("checkIncoming");
                break;
            }
        }
        if (!remoteCandidate) {
            // 7.2.1.3.  Learning Peer Reflexive Candidates
            remoteCandidate = new candidate_1.Candidate(utils_1.randomString(10), component, "udp", message.attributes["PRIORITY"], host, port, "prflx");
            this.remoteCandidates.push(remoteCandidate);
        }
        // find pair
        let pair = this.findPair(protocol, remoteCandidate);
        if (!pair) {
            pair = new CandidatePair(protocol, remoteCandidate);
            pair.state = CandidatePairState.WAITING;
            this.checkList.push(pair);
            this.sortCheckList();
        }
        // 7.2.1.4.  Triggered Checks
        if ([CandidatePairState.WAITING, CandidatePairState.FAILED].includes(pair.state)) {
            pair.handle = utils_1.future(this.checkStart(pair));
        }
        // 7.2.1.5. Updating the Nominated Flag
        if (message.attributesKeys.includes("USE-CANDIDATE") &&
            !this.iceControlling) {
            pair.remoteNominated = true;
            if (pair.state === CandidatePairState.SUCCEEDED) {
                pair.nominated = true;
                this.checkComplete(pair);
            }
        }
    }
    buildRequest(pair, nominate) {
        const txUsername = `${this.remoteUsername}:${this.localUserName}`;
        const request = new message_1.Message(const_1.methods.BINDING, const_1.classes.REQUEST);
        request.attributes["USERNAME"] = txUsername;
        request.attributes["PRIORITY"] = candidate_1.candidatePriority(pair.component, "prflx");
        if (this.iceControlling) {
            request.attributes["ICE-CONTROLLING"] = this._tieBreaker;
            if (nominate) {
                request.attributes["USE-CANDIDATE"] = null;
            }
        }
        else {
            request.attributes["ICE-CONTROLLED"] = this._tieBreaker;
        }
        return request;
    }
    respondError(request, addr, protocol, errorCode) {
        const response = new message_1.Message(request.messageMethod, const_1.classes.ERROR, request.transactionId);
        response.attributes["ERROR-CODE"] = errorCode;
        response.addMessageIntegrity(Buffer.from(this.localPassword, "utf8"));
        response.addFingerprint();
        protocol.sendStun(response, addr);
    }
}
exports.Connection = Connection;
class CandidatePair {
    constructor(protocol, remoteCandidate) {
        this.protocol = protocol;
        this.remoteCandidate = remoteCandidate;
        this.nominated = false;
        this.remoteNominated = false;
        // 5.7.4.  Computing States
        this.state = CandidatePairState.FROZEN;
    }
    get localCandidate() {
        if (!this.protocol.localCandidate)
            throw new Error("localCandidate not exist");
        return this.protocol.localCandidate;
    }
    get remoteAddr() {
        return [this.remoteCandidate.host, this.remoteCandidate.port];
    }
    get component() {
        return this.localCandidate.component;
    }
}
exports.CandidatePair = CandidatePair;
function validateRemoteCandidate(candidate) {
    // """
    // Check the remote candidate is supported.
    // """
    if (!["host", "relay", "srflx"].includes(candidate.type))
        throw new Error(`Unexpected candidate type "${candidate.type}"`);
    // ipaddress.ip_address(candidate.host)
    return candidate;
}
exports.validateRemoteCandidate = validateRemoteCandidate;
function sortCandidatePairs(pairs, iceControlling) {
    pairs.sort((a, b) => candidatePairPriority(a.localCandidate, a.remoteCandidate, iceControlling) -
        candidatePairPriority(b.localCandidate, b.remoteCandidate, iceControlling));
}
exports.sortCandidatePairs = sortCandidatePairs;
// 5.7.2.  Computing Pair Priority and Ordering Pairs
function candidatePairPriority(local, remote, iceControlling) {
    const G = (iceControlling && local.priority) || remote.priority;
    const D = (iceControlling && remote.priority) || local.priority;
    return (1 << 32) * Math.min(G, D) + 2 * Math.max(G, D) + (G > D ? 1 : 0);
}
exports.candidatePairPriority = candidatePairPriority;
function getHostAddress(useIpv4, useIpv6) {
    const address = [];
    if (useIpv4)
        address.push(nodeIp.address("", "ipv4"));
    if (useIpv6)
        address.push(nodeIp.address("", "ipv6"));
    return address;
}
exports.getHostAddress = getHostAddress;
function serverReflexiveCandidate(protocol, stunServer) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // """
        // Query STUN server to obtain a server-reflexive candidate.
        // """
        // # perform STUN query
        const request = new message_1.Message(const_1.methods.BINDING, const_1.classes.REQUEST);
        try {
            const [response] = yield protocol.request(request, stunServer);
            const localCandidate = protocol.localCandidate;
            if (!localCandidate)
                throw new Error();
            return new candidate_1.Candidate(candidate_1.candidateFoundation("srflx", "udp", localCandidate.host), localCandidate.component, localCandidate.transport, candidate_1.candidatePriority(localCandidate.component, "srflx"), response.attributes["XOR-MAPPED-ADDRESS"][0], response.attributes["XOR-MAPPED-ADDRESS"][1], "srflx", localCandidate.host, localCandidate.port);
        }
        catch (error) {
            // todo fix
        }
    });
}
exports.serverReflexiveCandidate = serverReflexiveCandidate;
function validateAddress(addr) {
    if (addr && isNaN(addr[1])) {
        addr[1] = 443;
    }
    return addr;
}
//# sourceMappingURL=ice.js.map