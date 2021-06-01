"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDevice = exports.Device = exports.version = exports.types = void 0;
const tslib_1 = require("tslib");
const Device_1 = require("./Device");
Object.defineProperty(exports, "Device", { enumerable: true, get: function () { return Device_1.Device; } });
Object.defineProperty(exports, "detectDevice", { enumerable: true, get: function () { return Device_1.detectDevice; } });
const types = tslib_1.__importStar(require("./types"));
exports.types = types;
/**
 * Expose mediasoup-client version.
 */
exports.version = '0.0.5';
/**
 * Expose parseScalabilityMode() function.
 */
var scalabilityModes_1 = require("./scalabilityModes");
Object.defineProperty(exports, "parseScalabilityMode", { enumerable: true, get: function () { return scalabilityModes_1.parse; } });
tslib_1.__exportStar(require("werift"), exports);
//# sourceMappingURL=index.js.map