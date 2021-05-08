export declare const SignatureAlgorithm: {
    readonly rsa: 1;
    readonly ecdsa: 3;
};
export declare type SignatureAlgorithms = typeof SignatureAlgorithm[keyof typeof SignatureAlgorithm];
export declare const HashAlgorithm: {
    readonly sha256: 4;
};
export declare type HashAlgorithms = typeof HashAlgorithm[keyof typeof HashAlgorithm];
export declare type SignatureHash = {
    hash: HashAlgorithms;
    signature: SignatureAlgorithms;
};
export declare const CipherSuite: {
    readonly TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256: 49195;
    readonly TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256: 49199;
};
export declare type CipherSuites = typeof CipherSuite[keyof typeof CipherSuite];
export declare const NamedCurveAlgorithm: {
    readonly x25519: 29;
    readonly secp256r1: 23;
};
export declare type NamedCurveAlgorithms = typeof NamedCurveAlgorithm[keyof typeof NamedCurveAlgorithm];
export declare const CurveType: {
    readonly named_curve: 3;
};
export declare type CurveTypes = typeof CurveType[keyof typeof CurveType];
export declare const SignatureScheme: {
    readonly rsa_pkcs1_sha256: 1025;
    readonly ecdsa_secp256r1_sha256: 1027;
};
export declare type SignatureSchemes = typeof SignatureScheme[keyof typeof SignatureScheme];
