/// <reference types="node" />
import { NamedCurveAlgorithms } from "./const";
export declare type NamedCurveKeyPair = {
    curve: NamedCurveAlgorithms;
    publicKey: Buffer;
    privateKey: Buffer;
};
export declare function generateKeyPair(namedCurve: NamedCurveAlgorithms): NamedCurveKeyPair;
