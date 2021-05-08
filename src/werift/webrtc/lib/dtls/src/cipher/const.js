"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignatureScheme = exports.CurveType = exports.NamedCurveAlgorithm = exports.CipherSuite = exports.HashAlgorithm = exports.SignatureAlgorithm = void 0;
exports.SignatureAlgorithm = {
    rsa: 1,
    ecdsa: 3,
};
exports.HashAlgorithm = {
    sha256: 4,
};
exports.CipherSuite = {
    TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256: 0xc02b,
    TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256: 0xc02f, //49199
};
exports.NamedCurveAlgorithm = {
    x25519: 29,
    secp256r1: 23,
};
exports.CurveType = { named_curve: 3 };
exports.SignatureScheme = {
    rsa_pkcs1_sha256: 0x0401,
    ecdsa_secp256r1_sha256: 0x0403,
};
//# sourceMappingURL=const.js.map