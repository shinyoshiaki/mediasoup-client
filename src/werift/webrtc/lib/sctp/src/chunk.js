"use strict";
// ID Value    Chunk Type
// -----       ----------
// 0          - Payload Data (DATA)
// 1          - Initiation (INIT)
// 2          - Initiation Acknowledgement (INIT ACK)
// 3          - Selective Acknowledgement (SACK)
// 4          - Heartbeat Request (HEARTBEAT)
// 5          - Heartbeat Acknowledgement (HEARTBEAT ACK)
// 6          - Abort (ABORT)
// 7          - Shutdown (SHUTDOWN)
// 8          - Shutdown Acknowledgement (SHUTDOWN ACK)
// 9          - Operation Error (ERROR)
// 10         - State Cookie (COOKIE ECHO)
// 11         - Cookie Acknowledgement (COOKIE ACK)
// 12         - Reserved for Explicit Congestion Notification Echo
//              (ECNE)
// 13         - Reserved for Congestion Window Reduced (CWR)
// 14         - Shutdown Complete (SHUTDOWN COMPLETE)
// 15 to 62   - available
// 63         - reserved for IETF-defined Chunk Extensions
// 64 to 126  - available
// 127        - reserved for IETF-defined Chunk Extensions
// 128 to 190 - available
// 191        - reserved for IETF-defined Chunk Extensions
// 192 to 254 - available
// 255        - reserved for IETF-defined Chunk Extensions
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializePacket = exports.parsePacket = exports.decodeParams = exports.CHUNK_BY_TYPE = exports.ShutdownCompleteChunk = exports.ShutdownAckChunk = exports.ShutdownChunk = exports.SackChunk = exports.ReconfigChunk = exports.HeartbeatAckChunk = exports.HeartbeatChunk = exports.ErrorChunk = exports.AbortChunk = exports.BaseParamsChunk = exports.CookieAckChunk = exports.CookieEchoChunk = exports.DataChunk = exports.ForwardTsnChunk = exports.ReConfigChunk = exports.InitAckChunk = exports.InitChunk = exports.BaseInitChunk = exports.Chunk = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const jspack_1 = require("jspack");
const rx_mini_1 = tslib_1.__importDefault(require("rx.mini"));
const crc32c = require("turbo-crc32/crc32c");
const log = debug_1.default("werift/sctp/chunk");
class Chunk {
    constructor(flags = 0, _body = Buffer.from("")) {
        this.flags = flags;
        this._body = _body;
    }
    get body() {
        return this._body;
    }
    set body(value) {
        this._body = value;
    }
    get type() {
        return Chunk.type;
    }
    get bytes() {
        if (!this.body)
            throw new Error();
        const data = Buffer.concat([
            Buffer.from(jspack_1.jspack.Pack("!BBH", [this.type, this.flags, this.body.length + 4])),
            this.body,
            ...[...Array(padL(this.body.length))].map(() => Buffer.from("\x00")),
        ]);
        return data;
    }
}
exports.Chunk = Chunk;
Chunk.type = -1;
class BaseInitChunk extends Chunk {
    constructor(flags = 0, body) {
        super(flags, body);
        this.flags = flags;
        if (body) {
            [
                this.initiateTag,
                this.advertisedRwnd,
                this.outboundStreams,
                this.inboundStreams,
                this.initialTsn,
            ] = jspack_1.jspack.Unpack("!LLHHL", body);
            this.params = decodeParams(body.slice(16));
        }
        else {
            this.initiateTag = 0;
            this.advertisedRwnd = 0;
            this.outboundStreams = 0;
            this.inboundStreams = 0;
            this.initialTsn = 0;
            this.params = [];
        }
    }
    get body() {
        let body = Buffer.from(jspack_1.jspack.Pack("!LLHHL", [
            this.initiateTag,
            this.advertisedRwnd,
            this.outboundStreams,
            this.inboundStreams,
            this.initialTsn,
        ]));
        body = Buffer.concat([body, encodeParams(this.params)]);
        return body;
    }
}
exports.BaseInitChunk = BaseInitChunk;
class InitChunk extends BaseInitChunk {
    get type() {
        return InitChunk.type;
    }
}
exports.InitChunk = InitChunk;
InitChunk.type = 1;
class InitAckChunk extends BaseInitChunk {
    get type() {
        return InitAckChunk.type;
    }
}
exports.InitAckChunk = InitAckChunk;
InitAckChunk.type = 2;
class ReConfigChunk extends BaseInitChunk {
    get type() {
        return ReConfigChunk.type;
    }
}
exports.ReConfigChunk = ReConfigChunk;
ReConfigChunk.type = 130;
class ForwardTsnChunk extends Chunk {
    constructor(flags = 0, body) {
        super(flags, body);
        this.flags = flags;
        this.streams = [];
        if (body) {
            this.cumulativeTsn = jspack_1.jspack.Unpack("!L", body)[0];
            let pos = 4;
            while (pos < body.length) {
                this.streams.push(jspack_1.jspack.Unpack("!HH", body.slice(pos)));
                pos += 4;
            }
        }
        else {
            this.cumulativeTsn = 0;
        }
    }
    get type() {
        return ForwardTsnChunk.type;
    }
    set body(_) { }
    get body() {
        const body = Buffer.from(jspack_1.jspack.Pack("!L", [this.cumulativeTsn]));
        return Buffer.concat([
            body,
            ...this.streams.map(([id, seq]) => Buffer.from(jspack_1.jspack.Pack("!HH", [id, seq]))),
        ]);
    }
}
exports.ForwardTsnChunk = ForwardTsnChunk;
ForwardTsnChunk.type = 192;
class DataChunk extends Chunk {
    constructor(flags = 0, body) {
        super(flags, body);
        this.flags = flags;
        this.tsn = 0;
        this.streamId = 0;
        this.streamSeqNum = 0;
        this.protocol = 0;
        this.userData = Buffer.from("");
        this.abandoned = false;
        this.acked = false;
        this.misses = 0;
        this.retransmit = false;
        this.sentCount = 0;
        this.bookSize = 0;
        this.onTransmit = new rx_mini_1.default();
        if (body) {
            [
                this.tsn,
                this.streamId,
                this.streamSeqNum,
                this.protocol,
            ] = jspack_1.jspack.Unpack("!LHHL", body);
            this.userData = body.slice(12);
        }
    }
    get type() {
        return DataChunk.type;
    }
    get bytes() {
        if (!this.userData.length)
            log("userData is empty");
        const length = 16 + this.userData.length;
        let data = Buffer.concat([
            Buffer.from(jspack_1.jspack.Pack("!BBHLHHL", [
                this.type,
                this.flags,
                length,
                this.tsn,
                this.streamId,
                this.streamSeqNum,
                this.protocol,
            ])),
            this.userData,
        ]);
        if (length % 4) {
            data = Buffer.concat([
                data,
                ...[...Array(padL(length))].map(() => Buffer.from("\x00")),
            ]);
        }
        return data;
    }
}
exports.DataChunk = DataChunk;
DataChunk.type = 0;
class CookieEchoChunk extends Chunk {
    get type() {
        return CookieEchoChunk.type;
    }
}
exports.CookieEchoChunk = CookieEchoChunk;
CookieEchoChunk.type = 10;
class CookieAckChunk extends Chunk {
    get type() {
        return CookieAckChunk.type;
    }
}
exports.CookieAckChunk = CookieAckChunk;
CookieAckChunk.type = 11;
class BaseParamsChunk extends Chunk {
    constructor(flags = 0, body = undefined) {
        super(flags, body);
        this.flags = flags;
        this.params = [];
        if (body) {
            this.params = decodeParams(body);
        }
    }
    get body() {
        return encodeParams(this.params);
    }
}
exports.BaseParamsChunk = BaseParamsChunk;
class AbortChunk extends BaseParamsChunk {
    get type() {
        return AbortChunk.type;
    }
}
exports.AbortChunk = AbortChunk;
AbortChunk.type = 6;
class ErrorChunk extends BaseParamsChunk {
    get type() {
        return ErrorChunk.type;
    }
    get descriptions() {
        return this.params.map(([code, body]) => {
            const name = (Object.entries(ErrorChunk.CODE).find(([, num]) => num === code) || [])[0];
            return { name, body };
        });
    }
}
exports.ErrorChunk = ErrorChunk;
ErrorChunk.type = 9;
ErrorChunk.CODE = {
    InvalidStreamIdentifier: 1,
    MissingMandatoryParameter: 2,
    StaleCookieError: 3,
    OutofResource: 4,
    UnresolvableAddress: 5,
    UnrecognizedChunkType: 6,
    InvalidMandatoryParameter: 7,
    UnrecognizedParameters: 8,
    NoUserData: 9,
    CookieReceivedWhileShuttingDown: 10,
    RestartofanAssociationwithNewAddresses: 11,
    UserInitiatedAbort: 12,
    ProtocolViolation: 13,
};
class HeartbeatChunk extends BaseParamsChunk {
    get type() {
        return HeartbeatChunk.type;
    }
}
exports.HeartbeatChunk = HeartbeatChunk;
HeartbeatChunk.type = 4;
class HeartbeatAckChunk extends BaseParamsChunk {
    get type() {
        return HeartbeatAckChunk.type;
    }
}
exports.HeartbeatAckChunk = HeartbeatAckChunk;
HeartbeatAckChunk.type = 5;
// https://tools.ietf.org/html/rfc6525#section-3.1
// chunkReconfig represents an SCTP Chunk used to reconfigure streams.
//
//  0                   1                   2                   3
//  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// | Type = 130    |  Chunk Flags  |      Chunk Length             |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// \                                                               \
// /                  Re-configuration Parameter                   /
// \                                                               \
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// \                                                               \
// /             Re-configuration Parameter (optional)             /
// \                                                               \
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
class ReconfigChunk extends BaseParamsChunk {
    get type() {
        return ReconfigChunk.type;
    }
}
exports.ReconfigChunk = ReconfigChunk;
ReconfigChunk.type = 130;
class SackChunk extends Chunk {
    constructor(flags = 0, body) {
        super(flags, body);
        this.flags = flags;
        this.gaps = [];
        this.duplicates = [];
        this.cumulativeTsn = 0;
        this.advertisedRwnd = 0;
        if (body) {
            const [cumulativeTsn, advertisedRwnd, nbGaps, nbDuplicates,] = jspack_1.jspack.Unpack("!LLHH", body);
            this.cumulativeTsn = cumulativeTsn;
            this.advertisedRwnd = advertisedRwnd;
            let pos = 12;
            [...Array(nbGaps)].forEach(() => {
                this.gaps.push(jspack_1.jspack.Unpack("!HH", body.slice(pos)));
                pos += 4;
            });
            [...Array(nbDuplicates)].forEach(() => {
                this.duplicates.push(jspack_1.jspack.Unpack("!L", body.slice(pos))[0]);
                pos += 4;
            });
        }
    }
    get type() {
        return SackChunk.type;
    }
    get bytes() {
        const length = 16 + 4 * (this.gaps.length + this.duplicates.length);
        let data = Buffer.from(jspack_1.jspack.Pack("!BBHLLHH", [
            this.type,
            this.flags,
            length,
            this.cumulativeTsn,
            this.advertisedRwnd,
            this.gaps.length,
            this.duplicates.length,
        ]));
        data = Buffer.concat([
            data,
            ...this.gaps.map((gap) => Buffer.from(jspack_1.jspack.Pack("!HH", gap))),
        ]);
        data = Buffer.concat([
            data,
            ...this.duplicates.map((tsn) => Buffer.from(jspack_1.jspack.Pack("!L", [tsn]))),
        ]);
        return data;
    }
}
exports.SackChunk = SackChunk;
SackChunk.type = 3;
class ShutdownChunk extends Chunk {
    constructor(flags = 0, body) {
        super(flags, body);
        this.flags = flags;
        this.cumulativeTsn = 0;
        if (body) {
            this.cumulativeTsn = jspack_1.jspack.Unpack("!L", body)[0];
        }
    }
    get type() {
        return ShutdownChunk.type;
    }
    get body() {
        return Buffer.from(jspack_1.jspack.Pack("!L", [this.cumulativeTsn]));
    }
}
exports.ShutdownChunk = ShutdownChunk;
ShutdownChunk.type = 7;
class ShutdownAckChunk extends Chunk {
    get type() {
        return ShutdownAckChunk.type;
    }
}
exports.ShutdownAckChunk = ShutdownAckChunk;
ShutdownAckChunk.type = 8;
class ShutdownCompleteChunk extends Chunk {
    get type() {
        return ShutdownCompleteChunk.type;
    }
}
exports.ShutdownCompleteChunk = ShutdownCompleteChunk;
ShutdownCompleteChunk.type = 14;
const CHUNK_CLASSES = [
    DataChunk,
    InitChunk,
    InitAckChunk,
    SackChunk,
    HeartbeatChunk,
    HeartbeatAckChunk,
    AbortChunk,
    ShutdownChunk,
    ShutdownAckChunk,
    ErrorChunk,
    CookieEchoChunk,
    CookieAckChunk,
    ShutdownCompleteChunk,
    ReconfigChunk,
    ForwardTsnChunk,
];
exports.CHUNK_BY_TYPE = CHUNK_CLASSES.reduce((acc, cur) => {
    acc[cur.type] = cur;
    return acc;
}, {});
function padL(l) {
    const m = l % 4;
    return m ? 4 - m : 0;
}
function encodeParams(params) {
    let body = Buffer.from("");
    let padding = Buffer.from("");
    params.forEach(([type, value]) => {
        const length = value.length + 4;
        body = Buffer.concat([
            body,
            padding,
            Buffer.from(jspack_1.jspack.Pack("!HH", [type, length])),
            value,
        ]);
        padding = Buffer.concat([...Array(padL(length))].map(() => Buffer.from("\x00")));
    });
    return body;
}
function decodeParams(body) {
    const params = [];
    let pos = 0;
    while (pos <= body.length - 4) {
        const [type, length] = jspack_1.jspack.Unpack("!HH", body.slice(pos));
        params.push([type, body.slice(pos + 4, pos + length)]);
        pos += length + padL(length);
    }
    return params;
}
exports.decodeParams = decodeParams;
function parsePacket(data) {
    if (data.length < 12)
        throw new Error("SCTP packet length is less than 12 bytes");
    const [sourcePort, destinationPort, verificationTag] = jspack_1.jspack.Unpack("!HHL", data);
    const checkSum = data.readUInt32LE(8);
    const expect = crc32c(Buffer.concat([
        data.slice(0, 8),
        Buffer.from("\x00\x00\x00\x00"),
        data.slice(12),
    ]));
    if (checkSum !== expect)
        throw new Error("SCTP packet has invalid checksum");
    const chunks = [];
    let pos = 12;
    while (pos + 4 <= data.length) {
        const [chunkType, chunkFlags, chunkLength] = jspack_1.jspack.Unpack("!BBH", data.slice(pos));
        const chunkBody = data.slice(pos + 4, pos + chunkLength);
        const ChunkClass = exports.CHUNK_BY_TYPE[chunkType.toString()];
        if (ChunkClass) {
            chunks.push(new ChunkClass(chunkFlags, chunkBody));
        }
        else {
            throw new Error("unknown");
        }
        pos += chunkLength + padL(chunkLength);
    }
    return [sourcePort, destinationPort, verificationTag, chunks];
}
exports.parsePacket = parsePacket;
function serializePacket(sourcePort, destinationPort, verificationTag, chunk) {
    const header = Buffer.from(jspack_1.jspack.Pack("!HHL", [sourcePort, destinationPort, verificationTag]));
    const body = chunk.bytes;
    const checksum = crc32c(Buffer.concat([header, Buffer.from("\x00\x00\x00\x00"), body]));
    const checkSumBuf = Buffer.alloc(4);
    checkSumBuf.writeUInt32LE(checksum, 0);
    const packet = Buffer.concat([header, checkSumBuf, body]);
    return packet;
}
exports.serializePacket = serializePacket;
//# sourceMappingURL=chunk.js.map