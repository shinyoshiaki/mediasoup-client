"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../src/utils");
describe("utils", () => {
    test("randomString", () => {
        expect(utils_1.randomString(23).length).toBe(23);
    });
});
//# sourceMappingURL=utils.test.js.map