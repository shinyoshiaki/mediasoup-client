"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePlainText = exports.parsePacket = void 0;
const tslib_1 = require("tslib");
const debug_1 = tslib_1.__importDefault(require("debug"));
const alert_1 = require("../handshake/message/alert");
const const_1 = require("./const");
const fragment_1 = require("./message/fragment");
const plaintext_1 = require("./message/plaintext");
const log = debug_1.default("werift/dtls/record/receive");
const parsePacket = (data) => {
    let start = 0;
    const packets = [];
    while (data.length > start) {
        const fragmentLength = data.readUInt16BE(start + 11);
        if (data.length < start + (12 + fragmentLength))
            break;
        const packet = plaintext_1.DtlsPlaintext.deSerialize(data.slice(start));
        packets.push(packet);
        start += 13 + fragmentLength;
    }
    return packets;
};
exports.parsePacket = parsePacket;
const parsePlainText = (dtls, cipher) => (plain) => {
    const contentType = plain.recordLayerHeader.contentType;
    switch (contentType) {
        case const_1.ContentType.changeCipherSpec: {
            log("change cipher spec");
            return {
                type: const_1.ContentType.changeCipherSpec,
                data: undefined,
            };
        }
        case const_1.ContentType.handshake: {
            let raw = plain.fragment;
            if (plain.recordLayerHeader.epoch > 0) {
                log("decrypt handshake");
                raw = cipher.decryptPacket(plain);
            }
            return {
                type: const_1.ContentType.handshake,
                data: fragment_1.FragmentedHandshake.deSerialize(raw),
            };
        }
        case const_1.ContentType.applicationData: {
            return {
                type: const_1.ContentType.applicationData,
                data: cipher.decryptPacket(plain),
            };
        }
        case const_1.ContentType.alert: {
            const alert = alert_1.Alert.deSerialize(plain.fragment);
            log("ContentType.alert", alert, dtls.flight, dtls.lastFlight);
            if (alert.level > 1)
                throw new Error("alert fatal error");
        }
        default: {
            return { type: const_1.ContentType.alert, data: undefined };
        }
    }
};
exports.parsePlainText = parsePlainText;
//# sourceMappingURL=receive.js.map