"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("../utils");
const transaction_1 = require("../../src/stun/transaction");
const message_1 = require("../../src/stun/message");
const const_1 = require("../../src/stun/const");
describe("stun", () => {
    test("test_binding_request", () => {
        const data = utils_1.readMessage("binding_request.bin");
        const message = message_1.parseMessage(data);
        expect(message.messageMethod).toBe(const_1.methods.BINDING);
        expect(message.messageClass).toBe(const_1.classes.REQUEST);
        expect(message.transactionId).toEqual(Buffer.from("Nvfx3lU7FUBF"));
        expect(message.attributes).toEqual({});
    });
    test("test_binding_request_ice_controlled", () => {
        const data = utils_1.readMessage("binding_request_ice_controlled.bin");
        const message = message_1.parseMessage(data);
        expect(message.messageMethod).toBe(const_1.methods.BINDING);
        expect(message.messageClass).toBe(const_1.classes.REQUEST);
        expect(message.transactionId).toEqual(Buffer.from("wxaNbAdXjwG3"));
        expect(message.attributes).toEqual({
            USERNAME: "AYeZ:sw7YvCSbcVex3bhi",
            PRIORITY: 1685987071,
            SOFTWARE: "FreeSWITCH (-37-987c9b9 64bit)",
            "ICE-CONTROLLED": BigInt("5491930053772927353"),
            "MESSAGE-INTEGRITY": Buffer.from("1963108a4f764015a66b3fea0b1883dfde1436c8", "hex"),
            FINGERPRINT: 3230414530,
        });
    });
    test("test_binding_request_ice_controlled_bad_fingerprint", () => {
        const data = Buffer.concat([
            utils_1.readMessage("binding_request_ice_controlled.bin").slice(0, -1),
            Buffer.from("z"),
        ]);
        try {
            message_1.parseMessage(data);
        }
        catch (error) {
            expect(error.message).toBe("STUN message fingerprint does not match");
        }
    });
    test("test_binding_request_ice_controlled_bad_integrity", () => {
        const data = utils_1.readMessage("binding_request_ice_controlled.bin");
        try {
            message_1.parseMessage(data, Buffer.from("bogus-key"));
        }
        catch (error) {
            expect(error.message).toBe("STUN message integrity does not match");
        }
    });
    test("test_binding_request_ice_controlling", () => {
        const data = utils_1.readMessage("binding_request_ice_controlling.bin");
        const message = message_1.parseMessage(data);
        expect(message.messageMethod).toBe(const_1.methods.BINDING);
        expect(message.messageClass).toBe(const_1.classes.REQUEST);
        expect(message.transactionId).toEqual(Buffer.from("JEwwUxjLWaa2"));
        expect(message.attributes).toEqual({
            USERNAME: "sw7YvCSbcVex3bhi:AYeZ",
            "ICE-CONTROLLING": BigInt("5943294521425135761"),
            "USE-CANDIDATE": null,
            PRIORITY: 1853759231,
            "MESSAGE-INTEGRITY": Buffer.from("c87b58eccbacdbc075d497ad0c965a82937ab587", "hex"),
            FINGERPRINT: 1347006354,
        });
    });
    test("test_binding_response", () => {
        const data = utils_1.readMessage("binding_response.bin");
        const message = message_1.parseMessage(data);
        expect(message.messageMethod).toBe(const_1.methods.BINDING);
        expect(message.messageClass).toBe(const_1.classes.RESPONSE);
        expect(message.transactionId).toEqual(Buffer.from("Nvfx3lU7FUBF"));
        expect(message.attributes).toEqual({
            "XOR-MAPPED-ADDRESS": ["80.200.136.90", 53054],
            "MAPPED-ADDRESS": ["80.200.136.90", 53054],
            "RESPONSE-ORIGIN": ["52.17.36.97", 3478],
            "OTHER-ADDRESS": ["52.17.36.97", 3479],
            SOFTWARE: "Citrix-3.2.4.5 'Marshal West'",
        });
    });
    test("test_message_body_length_mismatch", () => {
        const data = Buffer.concat([
            utils_1.readMessage("binding_response.bin"),
            Buffer.from("123"),
        ]);
        try {
            message_1.parseMessage(data);
        }
        catch (error) {
            expect(error.message).toBe("STUN message length does not match");
        }
    });
    test("test_message_shorter_than_header", () => {
        try {
            message_1.parseMessage(Buffer.from("123"));
        }
        catch (error) {
            expect(error.message).toBe("STUN message length is less than 20 bytes");
        }
    });
    test("test_timeout", () => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        const DummyProtocol = { sendStun: () => { } };
        const request = new message_1.Message(const_1.methods.BINDING, const_1.classes.REQUEST);
        const transaction = new transaction_1.Transaction(request, ["127.0.0.1", 1234], DummyProtocol);
        try {
            yield transaction.run();
        }
        catch (error) {
            expect(error.str).toBe("STUN transaction timed out");
        }
        const response = new message_1.Message(const_1.methods.BINDING, const_1.classes.RESPONSE);
        transaction.responseReceived(response, ["127.0.0.1", 1234]);
    }), 60 * 1000);
    test("test_bytes", () => {
        const request = new message_1.Message(const_1.methods.BINDING, const_1.classes.REQUEST);
        const bytes = request.bytes;
        const message = message_1.parseMessage(bytes);
        expect(request).toEqual(message);
    });
});
//# sourceMappingURL=stun.test.js.map