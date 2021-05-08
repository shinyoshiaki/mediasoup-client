"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIceServers = exports.uint24 = exports.uint32Add = exports.uint16Add = exports.uint8Add = exports.random32 = exports.random16 = exports.ntpTime = exports.milliTime = exports.microTime = exports.reverseDirection = exports.orDirection = exports.andDirection = exports.reverseSimulcastDirection = exports.isRtcp = exports.isMedia = exports.isDtls = exports.fingerprint = void 0;
const tslib_1 = require("tslib");
/* eslint-disable prefer-const */
const crypto_1 = require("crypto");
const jspack_1 = require("jspack");
const perf_hooks_1 = require("perf_hooks");
const rtpTransceiver_1 = require("./media/rtpTransceiver");
const debug_1 = tslib_1.__importDefault(require("debug"));
const now = require("nano-time");
const log = debug_1.default("werift/webrtc/utils");
function fingerprint(file, hashName) {
    const upper = (s) => s.toUpperCase();
    const colon = (s) => s.match(/(.{2})/g).join(":");
    const hash = crypto_1.createHash(hashName).update(file).digest("hex");
    return colon(upper(hash));
}
exports.fingerprint = fingerprint;
function isDtls(buf) {
    const firstByte = buf[0];
    return firstByte > 19 && firstByte < 64;
}
exports.isDtls = isDtls;
function isMedia(buf) {
    const firstByte = buf[0];
    return firstByte > 127 && firstByte < 192;
}
exports.isMedia = isMedia;
function isRtcp(buf) {
    return buf.length >= 2 && buf[1] >= 192 && buf[1] <= 208;
}
exports.isRtcp = isRtcp;
function reverseSimulcastDirection(dir) {
    if (dir === "recv")
        return "send";
    return "recv";
}
exports.reverseSimulcastDirection = reverseSimulcastDirection;
const andDirection = (a, b) => rtpTransceiver_1.Directions[rtpTransceiver_1.Directions.indexOf(a) & rtpTransceiver_1.Directions.indexOf(b)];
exports.andDirection = andDirection;
const orDirection = (a, b) => rtpTransceiver_1.Directions[rtpTransceiver_1.Directions.indexOf(a) & rtpTransceiver_1.Directions.indexOf(b)];
exports.orDirection = orDirection;
function reverseDirection(dir) {
    if (dir === "sendonly")
        return "recvonly";
    if (dir === "recvonly")
        return "sendonly";
    return dir;
}
exports.reverseDirection = reverseDirection;
const microTime = () => now.micro();
exports.microTime = microTime;
const milliTime = () => new Date().getTime();
exports.milliTime = milliTime;
const ntpTime = () => {
    const now = perf_hooks_1.performance.timeOrigin + perf_hooks_1.performance.now() - Date.UTC(1900, 0, 1);
    const div = now / 1000;
    let [sec, msec] = div.toString().slice(0, 14).split(".");
    if (!msec)
        msec = "0";
    const high = BigInt(sec);
    const v = BigInt(msec + [...Array(6 - msec.length)].fill(0).join(""));
    const low = (v * (1n << 32n)) / 1000000n;
    return (high << 32n) | low;
};
exports.ntpTime = ntpTime;
function random16() {
    return jspack_1.jspack.Unpack("!H", crypto_1.randomBytes(2))[0];
}
exports.random16 = random16;
function random32() {
    return BigInt(jspack_1.jspack.Unpack("!L", crypto_1.randomBytes(4))[0]);
}
exports.random32 = random32;
function uint8Add(a, b) {
    return (a + b) & 0xff;
}
exports.uint8Add = uint8Add;
function uint16Add(a, b) {
    return (a + b) & 0xffff;
}
exports.uint16Add = uint16Add;
function uint32Add(a, b) {
    return (a + b) & 0xffffffffn;
}
exports.uint32Add = uint32Add;
function uint24(v) {
    return v & 0xffffff;
}
exports.uint24 = uint24;
function parseIceServers(iceServers) {
    const url2Address = (url) => {
        if (!url)
            return;
        const [address, port] = url.split(":");
        return [address, Number(port)];
    };
    const stunServer = url2Address(iceServers.find(({ urls }) => urls.includes("stun:"))?.urls.slice(5));
    const turnServer = url2Address(iceServers.find(({ urls }) => urls.includes("turn:"))?.urls.slice(5));
    const { credential, username } = iceServers.find(({ urls }) => urls.includes("turn:")) || {};
    const options = {
        stunServer,
        turnServer,
        turnUsername: username,
        turnPassword: credential,
    };
    log("iceOptions", options);
    return options;
}
exports.parseIceServers = parseIceServers;
//# sourceMappingURL=utils.js.map