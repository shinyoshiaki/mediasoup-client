"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECONFIG_PARAM_BY_TYPES = exports.ReconfigResponseParam = exports.reconfigResult = exports.StreamAddOutgoingParam = exports.OutgoingSSNResetRequestParam = void 0;
const jspack_1 = require("jspack");
const lodash_1 = require("lodash");
// This parameter is used by the sender to request the reset of some or
// all outgoing streams.
//  0                   1                   2                   3
//  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |     Parameter Type = 13       | Parameter Length = 16 + 2 * N |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |           Re-configuration Request Sequence Number            |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |           Re-configuration Response Sequence Number           |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |                Sender's Last Assigned TSN                     |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |  Stream Number 1 (optional)   |    Stream Number 2 (optional) |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// /                            ......                             /
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |  Stream Number N-1 (optional) |    Stream Number N (optional) |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
class OutgoingSSNResetRequestParam {
    constructor(requestSequence, responseSequence, lastTsn, streams) {
        this.requestSequence = requestSequence;
        this.responseSequence = responseSequence;
        this.lastTsn = lastTsn;
        this.streams = streams;
    }
    get type() {
        return OutgoingSSNResetRequestParam.type;
    }
    get bytes() {
        const data = Buffer.from(jspack_1.jspack.Pack("!LLL", [
            this.requestSequence,
            this.responseSequence,
            this.lastTsn,
        ]));
        return Buffer.concat([
            data,
            ...this.streams.map((stream) => Buffer.from(jspack_1.jspack.Pack("!H", [stream]))),
        ]);
    }
    static parse(data) {
        const [requestSequence, responseSequence, lastTsn] = jspack_1.jspack.Unpack("!LLL", data);
        const stream = lodash_1.range(12, data.length, 2).map((pos) => jspack_1.jspack.Unpack("!H", data.slice(pos))[0]);
        return new OutgoingSSNResetRequestParam(requestSequence, responseSequence, lastTsn, stream);
    }
}
exports.OutgoingSSNResetRequestParam = OutgoingSSNResetRequestParam;
OutgoingSSNResetRequestParam.type = 13; // Outgoing SSN Reset Request Parameter
class StreamAddOutgoingParam {
    constructor(requestSequence, newStreams) {
        this.requestSequence = requestSequence;
        this.newStreams = newStreams;
    }
    get type() {
        return StreamAddOutgoingParam.type;
    }
    get bytes() {
        return Buffer.from(jspack_1.jspack.Pack("!LHH", [this.requestSequence, this.newStreams, 0]));
    }
    static parse(data) {
        const [requestSequence, newStreams] = jspack_1.jspack.Unpack("!LHH", data);
        return new StreamAddOutgoingParam(requestSequence, newStreams);
    }
}
exports.StreamAddOutgoingParam = StreamAddOutgoingParam;
StreamAddOutgoingParam.type = 17; // Add Outgoing Streams Request Parameter
// This parameter is used by the receiver of a Re-configuration Request
// Parameter to respond to the request.
//
// 0                   1                   2                   3
// 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |     Parameter Type = 16       |      Parameter Length         |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |         Re-configuration Response Sequence Number             |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |                            Result                             |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |                   Sender's Next TSN (optional)                |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// |                  Receiver's Next TSN (optional)               |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
exports.reconfigResult = {
    ReconfigResultSuccessPerformed: 1,
    BadSequenceNumber: 5,
};
class ReconfigResponseParam {
    constructor(responseSequence, result) {
        this.responseSequence = responseSequence;
        this.result = result;
    }
    get type() {
        return ReconfigResponseParam.type;
    }
    get bytes() {
        return Buffer.from(jspack_1.jspack.Pack("!LL", [this.responseSequence, this.result]));
    }
    static parse(data) {
        const [requestSequence, result] = jspack_1.jspack.Unpack("!LL", data);
        return new ReconfigResponseParam(requestSequence, result);
    }
}
exports.ReconfigResponseParam = ReconfigResponseParam;
ReconfigResponseParam.type = 16; // Re-configuration Response Parameter
exports.RECONFIG_PARAM_BY_TYPES = {
    13: OutgoingSSNResetRequestParam,
    16: ReconfigResponseParam,
    17: StreamAddOutgoingParam, // Add Outgoing Streams Request Parameter
};
//# sourceMappingURL=param.js.map