"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exceptions_1 = require("../src/exceptions");
const const_1 = require("../src/stun/const");
const message_1 = require("../src/stun/message");
describe("exceptions", () => {
    test("test_transaction_failed", () => {
        const response = new message_1.Message(const_1.methods.BINDING, const_1.classes.RESPONSE);
        response.attributes["ERROR-CODE"] = [487, "Role Conflict"];
        const exc = new exceptions_1.TransactionFailed(response);
        expect(exc.str).toBe("STUN transaction failed (487 - Role Conflict)");
    });
    test("test_transaction_timeout", () => {
        const exc = new exceptions_1.TransactionTimeout();
        expect(exc.str).toBe("STUN transaction timed out");
    });
});
//# sourceMappingURL=exceptions.test.js.map