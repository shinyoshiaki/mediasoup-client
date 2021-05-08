import AEADCipher from "./suites/aead";
/**
 * Convert cipher value to cipher instance.
 * @param {number} cipher
 */
export declare function createCipher(cipher: number): AEADCipher;
