"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTCSctpCapabilities = exports.InboundStream = exports.SCTP = void 0;
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const debug_1 = tslib_1.__importDefault(require("debug"));
const jspack_1 = require("jspack");
const lodash_1 = require("lodash");
const rx_mini_1 = require("rx.mini");
const chunk_1 = require("./chunk");
const const_1 = require("./const");
const helper_1 = require("./helper");
const param_1 = require("./param");
const utils_1 = require("./utils");
const log = debug_1.default("werift/sctp/sctp");
// SSN: Stream Sequence Number
// # local constants
const COOKIE_LENGTH = 24;
const COOKIE_LIFETIME = 60;
const MAX_STREAMS = 65535;
const USERDATA_MAX_LENGTH = 1200;
// # protocol constants
const SCTP_DATA_LAST_FRAG = 0x01;
const SCTP_DATA_FIRST_FRAG = 0x02;
const SCTP_DATA_UNORDERED = 0x04;
const SCTP_MAX_ASSOCIATION_RETRANS = 10;
const SCTP_MAX_INIT_RETRANS = 8;
const SCTP_RTO_ALPHA = 1 / 8;
const SCTP_RTO_BETA = 1 / 4;
const SCTP_RTO_INITIAL = 3;
const SCTP_RTO_MIN = 1;
const SCTP_RTO_MAX = 60;
const SCTP_TSN_MODULO = 2 ** 32;
const RECONFIG_MAX_STREAMS = 135;
// # parameters
const SCTP_STATE_COOKIE = 0x0007;
const SCTP_SUPPORTED_CHUNK_EXT = 0x8008; //32778
const SCTP_PRSCTP_SUPPORTED = 0xc000; //49152
const SCTPConnectionStates = [
    "new",
    "closed",
    "connected",
    "connecting",
];
class SCTP {
    constructor(transport, port = 5000) {
        this.transport = transport;
        this.port = port;
        this.stateChanged = helper_1.createEventsFromList(SCTPConnectionStates);
        this.onReconfigStreams = new rx_mini_1.Event();
        /**streamId: number, ppId: number, data: Buffer */
        this.onReceive = new rx_mini_1.Event();
        this.onSackReceived = async () => { };
        this.associationState = const_1.SCTP_STATE.CLOSED;
        this.started = false;
        this.state = "new";
        this.isServer = true;
        this.hmacKey = crypto_1.randomBytes(16);
        this.localPartialReliability = true;
        this.localPort = this.port;
        this.localVerificationTag = Number(utils_1.random32());
        this.remoteExtensions = [];
        this.remotePartialReliability = true;
        this.remoteVerificationTag = 0;
        // inbound
        this.advertisedRwnd = 1024 * 1024; // Receiver Window
        this.inboundStreams = {};
        this._inboundStreamsCount = 0;
        this._inboundStreamsMax = MAX_STREAMS;
        this.sackDuplicates = [];
        this.sackMisOrdered = new Set();
        this.sackNeeded = false;
        // # outbound
        this.cwnd = 3 * USERDATA_MAX_LENGTH; // Congestion Window
        this.fastRecoveryTransmit = false;
        this.flightSize = 0;
        this.outboundQueue = [];
        this.outboundStreamSeq = {};
        this._outboundStreamsCount = MAX_STREAMS;
        /**local transmission sequence number */
        this.localTsn = Number(utils_1.random32());
        this.lastSackedTsn = tsnMinusOne(this.localTsn);
        this.advancedPeerAckTsn = tsnMinusOne(this.localTsn); // acknowledgement
        this.partialBytesAcked = 0;
        this.sentQueue = [];
        // # reconfiguration
        /**初期TSNと同じ値に初期化される単調に増加する数です. これは、新しいre-configuration requestパラメーターを送信するたびに1ずつ増加します */
        this.reconfigRequestSeq = this.localTsn;
        /**このフィールドは、incoming要求のre-configuration requestシーケンス番号を保持します. 他の場合では、次に予想されるre-configuration requestシーケンス番号から1を引いた値が保持されます */
        this.reconfigResponseSeq = 0;
        this.reconfigQueue = [];
        // timers
        this.rto = SCTP_RTO_INITIAL;
        this.t1Failures = 0;
        this.t2Failures = 0;
        this.send = async (streamId, ppId, userData, expiry = undefined, maxRetransmits = undefined, ordered = true) => {
            const streamSeqNum = ordered ? this.outboundStreamSeq[streamId] || 0 : 0;
            const fragments = Math.ceil(userData.length / USERDATA_MAX_LENGTH);
            let pos = 0;
            const chunks = [];
            for (const fragment of lodash_1.range(0, fragments)) {
                const chunk = new chunk_1.DataChunk(0, undefined);
                chunk.flags = 0;
                if (!ordered) {
                    chunk.flags = SCTP_DATA_UNORDERED;
                }
                if (fragment === 0) {
                    chunk.flags |= SCTP_DATA_FIRST_FRAG;
                }
                if (fragment === fragments - 1) {
                    chunk.flags |= SCTP_DATA_LAST_FRAG;
                }
                chunk.tsn = this.localTsn;
                chunk.streamId = streamId;
                chunk.streamSeqNum = streamSeqNum;
                chunk.protocol = ppId;
                chunk.userData = userData.slice(pos, pos + USERDATA_MAX_LENGTH);
                chunk.bookSize = chunk.userData.length;
                chunk.expiry = expiry;
                chunk.maxRetransmits = maxRetransmits;
                pos += USERDATA_MAX_LENGTH;
                this.localTsn = tsnPlusOne(this.localTsn);
                chunks.push(chunk);
            }
            chunks.forEach((chunk) => {
                this.outboundQueue.push(chunk);
            });
            if (ordered) {
                this.outboundStreamSeq[streamId] = utils_1.uint16Add(streamSeqNum, 1);
            }
            if (!this.t3Handle) {
                await this.transmit();
            }
            else {
                await new Promise((r) => setImmediate(r));
            }
        };
        this.t1Expired = () => {
            this.t1Failures++;
            this.t1Handle = undefined;
            if (this.t1Failures > SCTP_MAX_INIT_RETRANS) {
                this.setState(const_1.SCTP_STATE.CLOSED);
            }
            else {
                setImmediate(() => this.sendChunk(this.t1Chunk));
                this.t1Handle = setTimeout(this.t1Expired, this.rto * 1000);
            }
        };
        this.t2Expired = () => {
            this.t2Failures++;
            this.t2Handle = undefined;
            if (this.t2Failures > SCTP_MAX_ASSOCIATION_RETRANS) {
                this.setState(const_1.SCTP_STATE.CLOSED);
            }
            else {
                setImmediate(() => this.sendChunk(this.t2Chunk));
                this.t2Handle = setTimeout(this.t2Expired, this.rto * 1000);
            }
        };
        // t3 is wait for data sack
        this.t3Expired = () => {
            this.t3Handle = undefined;
            // # mark retransmit or abandoned chunks
            this.sentQueue.forEach((chunk) => {
                if (!this.maybeAbandon(chunk)) {
                    chunk.retransmit = true;
                }
            });
            this.updateAdvancedPeerAckPoint();
            // # adjust congestion window
            this.fastRecoveryExit = undefined;
            this.flightSize = 0;
            this.partialBytesAcked = 0;
            this.ssthresh = Math.max(Math.floor(this.cwnd / 2), 4 * USERDATA_MAX_LENGTH);
            this.cwnd = USERDATA_MAX_LENGTH;
            this.transmit();
        };
        this.transport.onData = (buf) => {
            this.handleData(buf);
        };
    }
    get maxChannels() {
        if (this._inboundStreamsCount > 0)
            return Math.min(this._inboundStreamsCount, this._outboundStreamsCount);
    }
    static client(transport, port = 5000) {
        const sctp = new SCTP(transport, port);
        sctp.isServer = false;
        return sctp;
    }
    static server(transport, port = 5000) {
        const sctp = new SCTP(transport, port);
        sctp.isServer = true;
        return sctp;
    }
    // call from dtls transport
    async handleData(data) {
        let expectedTag;
        const [, , verificationTag, chunks] = chunk_1.parsePacket(data);
        const initChunk = chunks.filter((v) => v.type === chunk_1.InitChunk.type).length;
        if (initChunk > 0) {
            if (chunks.length != 1) {
                throw new Error();
            }
            expectedTag = 0;
        }
        else {
            expectedTag = this.localVerificationTag;
        }
        if (verificationTag !== expectedTag) {
            return;
        }
        for (const chunk of chunks) {
            await this.receiveChunk(chunk);
        }
        if (this.sackNeeded) {
            await this.sendSack();
        }
    }
    async sendSack() {
        const gaps = [];
        let gapNext;
        [...this.sackMisOrdered].sort().forEach((tsn) => {
            const pos = (tsn - this.lastReceivedTsn) % SCTP_TSN_MODULO;
            if (tsn === gapNext) {
                gaps[gaps.length - 1][1] = pos;
            }
            else {
                gaps.push([pos, pos]);
            }
            gapNext = tsnPlusOne(tsn);
        });
        const sack = new chunk_1.SackChunk(0, undefined);
        sack.cumulativeTsn = this.lastReceivedTsn;
        sack.advertisedRwnd = Math.max(0, this.advertisedRwnd);
        sack.duplicates = [...this.sackDuplicates];
        sack.gaps = gaps;
        await this.sendChunk(sack);
        this.sackDuplicates = [];
        this.sackNeeded = false;
    }
    async receiveChunk(chunk) {
        switch (chunk.type) {
            case chunk_1.DataChunk.type:
                this.receiveDataChunk(chunk);
                break;
            case chunk_1.InitChunk.type:
                const init = chunk;
                if (this.isServer) {
                    log("receive init", init);
                    this.lastReceivedTsn = tsnMinusOne(init.initialTsn);
                    this.reconfigResponseSeq = tsnMinusOne(init.initialTsn);
                    this.remoteVerificationTag = init.initiateTag;
                    this.ssthresh = init.advertisedRwnd;
                    this.getExtensions(init.params);
                    this._inboundStreamsCount = Math.min(init.outboundStreams, this._inboundStreamsMax);
                    this._outboundStreamsCount = Math.min(this._outboundStreamsCount, init.inboundStreams);
                    const ack = new chunk_1.InitAckChunk();
                    ack.initiateTag = this.localVerificationTag;
                    ack.advertisedRwnd = this.advertisedRwnd;
                    ack.outboundStreams = this._outboundStreamsCount;
                    ack.inboundStreams = this._inboundStreamsCount;
                    ack.initialTsn = this.localTsn;
                    this.setExtensions(ack.params);
                    const time = Date.now() / 1000;
                    let cookie = Buffer.from(jspack_1.jspack.Pack("!L", [time]));
                    cookie = Buffer.concat([
                        cookie,
                        crypto_1.createHmac("sha1", this.hmacKey).update(cookie).digest(),
                    ]);
                    ack.params.push([SCTP_STATE_COOKIE, cookie]);
                    log("send initAck", ack);
                    await this.sendChunk(ack);
                }
                break;
            case chunk_1.InitAckChunk.type:
                if (this.associationState === const_1.SCTP_STATE.COOKIE_WAIT) {
                    const initAck = chunk;
                    this.t1Cancel();
                    this.lastReceivedTsn = tsnMinusOne(initAck.initialTsn);
                    this.reconfigResponseSeq = tsnMinusOne(initAck.initialTsn);
                    this.remoteVerificationTag = initAck.initiateTag;
                    this.ssthresh = initAck.advertisedRwnd;
                    this.getExtensions(initAck.params);
                    this._inboundStreamsCount = Math.min(initAck.outboundStreams, this._inboundStreamsMax);
                    this._outboundStreamsCount = Math.min(this._outboundStreamsCount, initAck.inboundStreams);
                    const echo = new chunk_1.CookieEchoChunk();
                    for (const [k, v] of initAck.params) {
                        if (k === SCTP_STATE_COOKIE) {
                            echo.body = v;
                            break;
                        }
                    }
                    await this.sendChunk(echo);
                    this.t1Start(echo);
                    this.setState(const_1.SCTP_STATE.COOKIE_ECHOED);
                }
                break;
            case chunk_1.SackChunk.type:
                await this.receiveSackChunk(chunk);
                break;
            case chunk_1.HeartbeatChunk.type:
                const ack = new chunk_1.HeartbeatAckChunk();
                ack.params = chunk.params;
                await this.sendChunk(ack);
                break;
            case chunk_1.AbortChunk.type:
                this.setState(const_1.SCTP_STATE.CLOSED);
                break;
            case chunk_1.ShutdownChunk.type:
                {
                    this.t2Cancel();
                    this.setState(const_1.SCTP_STATE.SHUTDOWN_RECEIVED);
                    const ack = new chunk_1.ShutdownAckChunk();
                    await this.sendChunk(ack);
                    this.t2Start(ack);
                    this.setState(const_1.SCTP_STATE.SHUTDOWN_SENT);
                }
                break;
            case chunk_1.ErrorChunk.type:
                // 3.3.10.  Operation Error (ERROR) (9)
                // An Operation Error is not considered fatal in and of itself, but may be
                // used with an ABORT chunk to report a fatal condition.  It has the
                // following parameters:
                log("ErrorChunk", chunk.descriptions);
                break;
            case chunk_1.CookieEchoChunk.type:
                const data = chunk;
                if (this.isServer) {
                    const cookie = data.body;
                    const digest = crypto_1.createHmac("sha1", this.hmacKey)
                        .update(cookie.slice(0, 4))
                        .digest();
                    if (cookie?.length != COOKIE_LENGTH ||
                        !cookie.slice(4).equals(digest)) {
                        log("x State cookie is invalid");
                        return;
                    }
                    const now = Date.now() / 1000;
                    const stamp = jspack_1.jspack.Unpack("!L", cookie)[0];
                    if (stamp < now - COOKIE_LIFETIME || stamp > now) {
                        const error = new chunk_1.ErrorChunk(0, undefined);
                        error.params.push([
                            chunk_1.ErrorChunk.CODE.StaleCookieError,
                            Buffer.concat([...Array(8)].map(() => Buffer.from("\x00"))),
                        ]);
                        await this.sendChunk(error);
                        return;
                    }
                    const ack = new chunk_1.CookieAckChunk();
                    await this.sendChunk(ack);
                    this.setState(const_1.SCTP_STATE.ESTABLISHED);
                }
                break;
            case chunk_1.CookieAckChunk.type:
                if (this.associationState === const_1.SCTP_STATE.COOKIE_ECHOED) {
                    this.t1Cancel();
                    this.setState(const_1.SCTP_STATE.ESTABLISHED);
                }
                break;
            case chunk_1.ShutdownCompleteChunk.type:
                if (this.associationState === const_1.SCTP_STATE.SHUTDOWN_ACK_SENT) {
                    this.t2Cancel();
                    this.setState(const_1.SCTP_STATE.CLOSED);
                }
                break;
            // extensions
            case chunk_1.ReconfigChunk.type:
                if (this.associationState === const_1.SCTP_STATE.ESTABLISHED) {
                    const reconfig = chunk;
                    for (const [type, body] of reconfig.params) {
                        const target = param_1.RECONFIG_PARAM_BY_TYPES[type];
                        if (target) {
                            await this.receiveReconfigParam(target.parse(body));
                        }
                    }
                }
                break;
            case chunk_1.ForwardTsnChunk.type:
                this.receiveForwardTsnChunk(chunk);
                break;
        }
    }
    getExtensions(params) {
        for (const [k, v] of params) {
            if (k === SCTP_PRSCTP_SUPPORTED) {
                this.remotePartialReliability = true;
            }
            else if (k === SCTP_SUPPORTED_CHUNK_EXT) {
                this.remoteExtensions = [...v];
            }
        }
    }
    async receiveReconfigParam(param) {
        log("receiveReconfigParam", param_1.RECONFIG_PARAM_BY_TYPES[param.type]);
        switch (param.type) {
            case param_1.OutgoingSSNResetRequestParam.type:
                {
                    const p = param;
                    // # send response
                    const response = new param_1.ReconfigResponseParam(p.requestSequence, param_1.reconfigResult.ReconfigResultSuccessPerformed);
                    this.reconfigResponseSeq = p.requestSequence;
                    await this.sendReconfigParam(response);
                    // # mark closed inbound streams
                    await Promise.all(p.streams.map(async (streamId) => {
                        delete this.inboundStreams[streamId];
                        if (this.outboundStreamSeq[streamId]) {
                            this.reconfigQueue.push(streamId);
                            await this.sendResetRequest(streamId);
                        }
                    }));
                    // # close data channel
                    this.onReconfigStreams.execute(p.streams);
                    await this.transmitReconfig();
                }
                break;
            case param_1.ReconfigResponseParam.type:
                {
                    const reset = param;
                    if (reset.result !== param_1.reconfigResult.ReconfigResultSuccessPerformed) {
                        log("OutgoingSSNResetRequestParam failed", Object.keys(param_1.reconfigResult).find((key) => param_1.reconfigResult[key] === reset.result));
                    }
                    else if (this.reconfigRequest &&
                        reset.responseSequence === this.reconfigRequest.requestSequence) {
                        const streamIds = this.reconfigRequest.streams.map((streamId) => {
                            delete this.outboundStreamSeq[streamId];
                            return streamId;
                        });
                        this.onReconfigStreams.execute(streamIds);
                        this.reconfigRequest = undefined;
                        await this.transmitReconfig();
                    }
                }
                break;
            case param_1.StreamAddOutgoingParam.type:
                {
                    const add = param;
                    this._inboundStreamsCount += add.newStreams;
                    const res = new param_1.ReconfigResponseParam(add.requestSequence, 1);
                    this.reconfigResponseSeq = add.requestSequence;
                    await this.sendReconfigParam(res);
                }
                break;
        }
    }
    receiveDataChunk(chunk) {
        this.sackNeeded = true;
        if (this.markReceived(chunk.tsn))
            return;
        const inboundStream = this.getInboundStream(chunk.streamId);
        inboundStream.addChunk(chunk);
        this.advertisedRwnd -= chunk.userData.length;
        for (const message of inboundStream.popMessages()) {
            this.advertisedRwnd += message[2].length;
            this.receive(...message);
        }
    }
    async receiveSackChunk(chunk) {
        // """
        // Handle a SACK chunk.
        // """
        if (utils_1.uint32Gt(this.lastSackedTsn, chunk.cumulativeTsn))
            return;
        const receivedTime = Date.now() / 1000;
        this.lastSackedTsn = chunk.cumulativeTsn;
        const cwndFullyUtilized = this.flightSize >= this.cwnd;
        let done = 0, doneBytes = 0;
        // # handle acknowledged data
        while (this.sentQueue.length > 0 &&
            utils_1.uint32Gte(this.lastSackedTsn, this.sentQueue[0].tsn)) {
            const sChunk = this.sentQueue.shift();
            done++;
            if (!sChunk?.acked) {
                doneBytes += sChunk.bookSize;
                this.flightSizeDecrease(sChunk);
            }
            if (done === 1 && sChunk.sentCount === 1) {
                this.updateRto(receivedTime - sChunk.sentTime);
            }
        }
        // # handle gap blocks
        let loss = false;
        if (chunk.gaps.length > 0) {
            const seen = new Set();
            let highestSeenTsn;
            chunk.gaps.forEach((gap) => lodash_1.range(gap[0], gap[1] + 1).forEach((pos) => {
                highestSeenTsn = (chunk.cumulativeTsn + pos) % SCTP_TSN_MODULO;
                seen.add(highestSeenTsn);
            }));
            let highestNewlyAcked = chunk.cumulativeTsn;
            for (const sChunk of this.sentQueue) {
                if (utils_1.uint32Gt(sChunk.tsn, highestSeenTsn)) {
                    break;
                }
                if (seen.has(sChunk.tsn) && !sChunk.acked) {
                    doneBytes += sChunk.bookSize;
                    sChunk.acked = true;
                    this.flightSizeDecrease(sChunk);
                    highestNewlyAcked = sChunk.tsn;
                }
            }
            // # strike missing chunks prior to HTNA
            for (const sChunk of this.sentQueue) {
                if (utils_1.uint32Gt(sChunk.tsn, highestNewlyAcked)) {
                    break;
                }
                if (!seen.has(sChunk.tsn)) {
                    sChunk.misses++;
                    if (sChunk.misses === 3) {
                        sChunk.misses = 0;
                        if (!this.maybeAbandon(sChunk)) {
                            sChunk.retransmit = true;
                        }
                        sChunk.acked = false;
                        this.flightSizeDecrease(sChunk);
                        loss = true;
                    }
                }
            }
        }
        // # adjust congestion window
        if (this.fastRecoveryExit === undefined) {
            if (done && cwndFullyUtilized) {
                if (this.cwnd <= this.ssthresh) {
                    this.cwnd += Math.min(doneBytes, USERDATA_MAX_LENGTH);
                }
                else {
                    this.partialBytesAcked += doneBytes;
                    if (this.partialBytesAcked >= this.cwnd) {
                        this.partialBytesAcked -= this.cwnd;
                        this.cwnd += USERDATA_MAX_LENGTH;
                    }
                }
            }
            if (loss) {
                this.ssthresh = Math.max(Math.floor(this.cwnd / 2), 4 * USERDATA_MAX_LENGTH);
                this.cwnd = this.ssthresh;
                this.partialBytesAcked = 0;
                this.fastRecoveryExit = this.sentQueue[this.sentQueue.length - 1].tsn;
                this.fastRecoveryTransmit = true;
            }
        }
        else if (utils_1.uint32Gte(chunk.cumulativeTsn, this.fastRecoveryExit)) {
            this.fastRecoveryExit = undefined;
        }
        if (this.sentQueue.length === 0) {
            this.t3Cancel();
        }
        else if (done > 0) {
            this.t3Restart();
        }
        this.updateAdvancedPeerAckPoint();
        await this.onSackReceived();
        await this.transmit();
    }
    receiveForwardTsnChunk(chunk) {
        this.sackNeeded = true;
        if (utils_1.uint32Gte(this.lastReceivedTsn, chunk.cumulativeTsn)) {
            return;
        }
        const isObsolete = (x) => utils_1.uint32Gt(x, this.lastReceivedTsn);
        // # advance cumulative TSN
        this.lastReceivedTsn = chunk.cumulativeTsn;
        this.sackMisOrdered = new Set([...this.sackMisOrdered].filter(isObsolete));
        for (const tsn of [...this.sackMisOrdered].sort()) {
            if (tsn === tsnPlusOne(this.lastReceivedTsn)) {
                this.lastReceivedTsn = tsn;
            }
            else {
                break;
            }
        }
        // # filter out obsolete entries
        this.sackDuplicates = this.sackDuplicates.filter(isObsolete);
        this.sackMisOrdered = new Set([...this.sackMisOrdered].filter(isObsolete));
        // # update reassembly
        for (const [streamId, streamSeqNum] of chunk.streams) {
            const inboundStream = this.getInboundStream(streamId);
            // # advance sequence number and perform delivery
            inboundStream.streamSequenceNumber = utils_1.uint16Add(streamSeqNum, 1);
            for (const message of inboundStream.popMessages()) {
                this.advertisedRwnd += message[2].length;
                this.receive(...message);
            }
        }
        // # prune obsolete chunks
        Object.values(this.inboundStreams).forEach((inboundStream) => {
            this.advertisedRwnd += inboundStream.pruneChunks(this.lastReceivedTsn);
        });
    }
    updateRto(R) {
        if (!this.srtt) {
            this.rttvar = R / 2;
            this.srtt = R;
        }
        else {
            this.rttvar =
                (1 - SCTP_RTO_BETA) * this.rttvar +
                    SCTP_RTO_BETA * Math.abs(this.srtt - R);
            this.srtt = (1 - SCTP_RTO_ALPHA) * this.srtt + SCTP_RTO_ALPHA * R;
        }
        this.rto = Math.max(SCTP_RTO_MIN, Math.min(this.srtt + 4 * this.rttvar, SCTP_RTO_MAX));
    }
    receive(streamId, ppId, data) {
        this.onReceive.execute(streamId, ppId, data);
    }
    getInboundStream(streamId) {
        if (!this.inboundStreams[streamId]) {
            this.inboundStreams[streamId] = new InboundStream();
        }
        return this.inboundStreams[streamId];
    }
    markReceived(tsn) {
        if (utils_1.uint32Gte(this.lastReceivedTsn, tsn) || this.sackMisOrdered.has(tsn)) {
            this.sackDuplicates.push(tsn);
            return true;
        }
        this.sackMisOrdered.add(tsn);
        for (const tsn of [...this.sackMisOrdered].sort()) {
            if (tsn === tsnPlusOne(this.lastReceivedTsn)) {
                this.lastReceivedTsn = tsn;
            }
            else {
                break;
            }
        }
        const isObsolete = (x) => utils_1.uint32Gt(x, this.lastReceivedTsn);
        this.sackDuplicates = this.sackDuplicates.filter(isObsolete);
        this.sackMisOrdered = new Set([...this.sackMisOrdered].filter(isObsolete));
        return false;
    }
    async transmit() {
        // """
        // Transmit outbound data.
        // """
        // # send FORWARD TSN
        if (this.forwardTsnChunk) {
            await this.sendChunk(this.forwardTsnChunk);
            this.forwardTsnChunk = undefined;
            if (!this.t3Handle) {
                this.t3Start();
            }
        }
        const burstSize = this.fastRecoveryExit != undefined
            ? 2 * USERDATA_MAX_LENGTH
            : 4 * USERDATA_MAX_LENGTH;
        const cwnd = Math.min(this.flightSize + burstSize, this.cwnd);
        let retransmitEarliest = true;
        for (const dataChunk of this.sentQueue) {
            if (dataChunk.retransmit) {
                if (this.fastRecoveryTransmit) {
                    this.fastRecoveryTransmit = false;
                }
                else if (this.flightSize >= cwnd) {
                    return;
                }
                this.flightSizeIncrease(dataChunk);
                dataChunk.misses = 0;
                dataChunk.retransmit = false;
                dataChunk.sentCount++;
                await this.sendChunk(dataChunk);
                if (retransmitEarliest) {
                    this.t3Restart();
                }
            }
            retransmitEarliest = false;
        }
        // for performance todo fix
        while (this.outboundQueue.length > 0) {
            const chunk = this.outboundQueue.shift();
            if (!chunk)
                return;
            this.sentQueue.push(chunk);
            this.flightSizeIncrease(chunk);
            // # update counters
            chunk.sentCount++;
            chunk.sentTime = Date.now() / 1000;
            await this.sendChunk(chunk);
            if (!this.t3Handle) {
                this.t3Start();
            }
        }
    }
    async transmitReconfig() {
        if (this.associationState === const_1.SCTP_STATE.ESTABLISHED &&
            this.reconfigQueue.length > 0 &&
            !this.reconfigRequest) {
            const streams = this.reconfigQueue.slice(0, RECONFIG_MAX_STREAMS);
            this.reconfigQueue = this.reconfigQueue.slice(RECONFIG_MAX_STREAMS);
            const param = new param_1.OutgoingSSNResetRequestParam(this.reconfigRequestSeq, this.reconfigResponseSeq, tsnMinusOne(this.localTsn), streams);
            this.reconfigRequest = param;
            this.reconfigRequestSeq = tsnPlusOne(this.reconfigRequestSeq);
            await this.sendReconfigParam(param);
        }
    }
    async sendReconfigParam(param) {
        log("sendReconfigParam", param);
        const chunk = new chunk_1.ReconfigChunk();
        chunk.params.push([param.type, param.bytes]);
        await this.sendChunk(chunk);
    }
    // https://github.com/pion/sctp/pull/44/files
    async sendResetRequest(streamId) {
        log("sendResetRequest", streamId);
        const chunk = new chunk_1.DataChunk(0, undefined);
        chunk.streamId = streamId;
        this.outboundQueue.push(chunk);
        if (!this.t3Handle) {
            await this.transmit();
        }
    }
    flightSizeIncrease(chunk) {
        this.flightSize += chunk.bookSize;
    }
    flightSizeDecrease(chunk) {
        this.flightSize = Math.max(0, this.flightSize - chunk.bookSize);
    }
    // # timers
    // t1 is wait for initAck or cookieAck
    t1Cancel() {
        if (this.t1Handle) {
            clearTimeout(this.t1Handle);
            this.t1Handle = undefined;
            this.t1Chunk = undefined;
        }
    }
    t1Start(chunk) {
        if (this.t1Handle)
            throw new Error();
        this.t1Chunk = chunk;
        this.t1Failures = 0;
        this.t1Handle = setTimeout(this.t1Expired, this.rto * 1000);
    }
    // t2 is wait for shutdown
    t2Cancel() {
        if (this.t2Handle) {
            clearTimeout(this.t2Handle);
            this.t2Handle = undefined;
            this.t2Chunk = undefined;
        }
    }
    t2Start(chunk) {
        if (this.t2Handle)
            throw new Error();
        this.t2Chunk = chunk;
        this.t2Failures = 0;
        this.t2Handle = setTimeout(this.t2Expired, this.rto * 1000);
    }
    t3Restart() {
        this.t3Cancel();
        // for performance
        this.t3Handle = setTimeout(this.t3Expired, this.rto);
    }
    t3Start() {
        if (this.t3Handle)
            throw new Error();
        this.t3Handle = setTimeout(this.t3Expired, this.rto * 1000);
    }
    t3Cancel() {
        if (this.t3Handle) {
            clearTimeout(this.t3Handle);
            this.t3Handle = undefined;
        }
    }
    updateAdvancedPeerAckPoint() {
        if (utils_1.uint32Gt(this.lastSackedTsn, this.advancedPeerAckTsn)) {
            this.advancedPeerAckTsn = this.lastSackedTsn;
        }
        let done = 0;
        const streams = {};
        while (this.sentQueue.length > 0 && this.sentQueue[0].abandoned) {
            const chunk = this.sentQueue.shift();
            this.advancedPeerAckTsn = chunk.tsn;
            done++;
            if (!(chunk.flags & SCTP_DATA_UNORDERED)) {
                streams[chunk.streamId] = chunk.streamSeqNum;
            }
        }
        if (done) {
            this.forwardTsnChunk = new chunk_1.ForwardTsnChunk(0, undefined);
            this.forwardTsnChunk.cumulativeTsn = this.advancedPeerAckTsn;
            this.forwardTsnChunk.streams = Object.entries(streams).map(([k, v]) => [
                Number(k),
                v,
            ]);
        }
    }
    maybeAbandon(chunk) {
        if (chunk.abandoned)
            return true;
        const abandon = (!!chunk.maxRetransmits && chunk.maxRetransmits < chunk.sentCount) ||
            (!!chunk.expiry && chunk.expiry < Date.now() / 1000);
        if (!abandon)
            return false;
        const chunkPos = this.sentQueue.findIndex((v) => v.type === chunk.type);
        for (const pos of lodash_1.range(chunkPos, -1, -1)) {
            const oChunk = this.sentQueue[pos];
            oChunk.abandoned = true;
            oChunk.retransmit = false;
            if (oChunk.flags & SCTP_DATA_LAST_FRAG) {
                break;
            }
        }
        for (const pos of lodash_1.range(chunkPos, this.sentQueue.length)) {
            const oChunk = this.sentQueue[pos];
            oChunk.abandoned = true;
            oChunk.retransmit = false;
            if (oChunk.flags & SCTP_DATA_LAST_FRAG) {
                break;
            }
        }
        return true;
    }
    static getCapabilities() {
        return new RTCSctpCapabilities(65536);
    }
    async start(remotePort) {
        if (!this.started) {
            this.started = true;
            this.setConnectionState("connecting");
            this.remotePort = remotePort;
            if (!this.isServer) {
                await this.init();
            }
        }
    }
    async init() {
        const init = new chunk_1.InitChunk();
        init.initiateTag = this.localVerificationTag;
        init.advertisedRwnd = this.advertisedRwnd;
        init.outboundStreams = this._outboundStreamsCount;
        init.inboundStreams = this._inboundStreamsMax;
        init.initialTsn = this.localTsn;
        this.setExtensions(init.params);
        log("send init", init);
        await this.sendChunk(init);
        // # start T1 timer and enter COOKIE-WAIT state
        this.t1Start(init);
        this.setState(const_1.SCTP_STATE.COOKIE_WAIT);
    }
    setExtensions(params) {
        const extensions = [];
        if (this.localPartialReliability) {
            params.push([SCTP_PRSCTP_SUPPORTED, Buffer.from("")]);
            extensions.push(chunk_1.ForwardTsnChunk.type);
        }
        extensions.push(chunk_1.ReConfigChunk.type);
        params.push([SCTP_SUPPORTED_CHUNK_EXT, Buffer.from(extensions)]);
    }
    async sendChunk(chunk) {
        if (this.remotePort === undefined)
            throw new Error("invalid remote port");
        if (this.state === "closed")
            return;
        if (chunk instanceof chunk_1.DataChunk) {
            chunk.onTransmit.execute();
        }
        const packet = chunk_1.serializePacket(this.localPort, this.remotePort, this.remoteVerificationTag, chunk);
        await this.transport.send(packet);
    }
    setState(state) {
        if (state != this.associationState) {
            this.associationState = state;
        }
        if (state === const_1.SCTP_STATE.ESTABLISHED) {
            this.setConnectionState("connected");
        }
        else if (state === const_1.SCTP_STATE.CLOSED) {
            this.t1Cancel();
            this.t2Cancel();
            this.t3Cancel();
            this.setConnectionState("closed");
            this.removeAllListeners();
        }
    }
    setConnectionState(state) {
        this.state = state;
        this.stateChanged[state].execute();
    }
    async stop() {
        if (this.associationState !== const_1.SCTP_STATE.CLOSED) {
            await this.abort();
        }
        this.setState(const_1.SCTP_STATE.CLOSED);
        clearTimeout(this.t1Handle);
        clearTimeout(this.t2Handle);
        clearTimeout(this.t3Handle);
    }
    async abort() {
        const abort = new chunk_1.AbortChunk();
        await this.sendChunk(abort);
    }
    removeAllListeners() {
        Object.values(this.stateChanged).forEach((v) => v.allUnsubscribe());
    }
}
exports.SCTP = SCTP;
class InboundStream {
    constructor() {
        this.reassembly = [];
        this.streamSequenceNumber = 0; // SSN
    }
    addChunk(chunk) {
        if (this.reassembly.length === 0 ||
            utils_1.uint32Gt(chunk.tsn, this.reassembly[this.reassembly.length - 1].tsn)) {
            this.reassembly.push(chunk);
            return;
        }
        for (const [i, v] of helper_1.enumerate(this.reassembly)) {
            if (v.tsn === chunk.tsn)
                throw new Error("duplicate chunk in reassembly");
            if (utils_1.uint32Gt(v.tsn, chunk.tsn)) {
                this.reassembly.splice(i, 0, chunk);
                break;
            }
        }
    }
    *popMessages() {
        let pos = 0;
        let startPos;
        let expectedTsn;
        let ordered;
        while (pos < this.reassembly.length) {
            const chunk = this.reassembly[pos];
            if (startPos === undefined) {
                ordered = !(chunk.flags & SCTP_DATA_UNORDERED);
                if (!(chunk.flags & SCTP_DATA_FIRST_FRAG)) {
                    if (ordered) {
                        break;
                    }
                    else {
                        pos++;
                        continue;
                    }
                }
                if (ordered &&
                    utils_1.uint16Gt(chunk.streamSeqNum, this.streamSequenceNumber)) {
                    break;
                }
                expectedTsn = chunk.tsn;
                startPos = pos;
            }
            else if (chunk.tsn !== expectedTsn) {
                if (ordered) {
                    break;
                }
                else {
                    startPos = undefined;
                    pos++;
                    continue;
                }
            }
            if (chunk.flags & SCTP_DATA_LAST_FRAG) {
                const arr = this.reassembly
                    .slice(startPos, pos + 1)
                    .map((c) => c.userData)
                    .reduce((acc, cur) => {
                    acc.push(cur);
                    acc.push(Buffer.from(""));
                    return acc;
                }, []);
                arr.pop();
                const userData = Buffer.concat(arr);
                this.reassembly = [
                    ...this.reassembly.slice(0, startPos),
                    ...this.reassembly.slice(pos + 1),
                ];
                if (ordered && chunk.streamSeqNum === this.streamSequenceNumber) {
                    this.streamSequenceNumber = utils_1.uint16Add(this.streamSequenceNumber, 1);
                }
                pos = startPos;
                yield [chunk.streamId, chunk.protocol, userData];
            }
            else {
                pos++;
            }
            expectedTsn = tsnPlusOne(expectedTsn);
        }
    }
    pruneChunks(tsn) {
        // """
        // Prune chunks up to the given TSN.
        // """
        let pos = -1, size = 0;
        for (const [i, chunk] of this.reassembly.entries()) {
            if (utils_1.uint32Gte(tsn, chunk.tsn)) {
                pos = i;
                size += chunk.userData.length;
            }
            else {
                break;
            }
        }
        this.reassembly = this.reassembly.slice(pos + 1);
        return size;
    }
}
exports.InboundStream = InboundStream;
class RTCSctpCapabilities {
    constructor(maxMessageSize) {
        this.maxMessageSize = maxMessageSize;
    }
}
exports.RTCSctpCapabilities = RTCSctpCapabilities;
function tsnMinusOne(a) {
    return (a - 1) % SCTP_TSN_MODULO;
}
function tsnPlusOne(a) {
    return (a + 1) % SCTP_TSN_MODULO;
}
//# sourceMappingURL=sctp.js.map