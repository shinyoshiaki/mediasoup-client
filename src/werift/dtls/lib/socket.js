"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DtlsSocket = void 0;
const tslib_1 = require("tslib");
const transport_1 = require("./context/transport");
const dtls_1 = require("./context/dtls");
const cipher_1 = require("./context/cipher");
const builder_1 = require("./record/builder");
const const_1 = require("./record/const");
const useSrtp_1 = require("./handshake/extensions/useSrtp");
const ellipticCurves_1 = require("./handshake/extensions/ellipticCurves");
const const_2 = require("./cipher/const");
const signature_1 = require("./handshake/extensions/signature");
const srtp_1 = require("./context/srtp");
const prf_1 = require("./cipher/prf");
const binary_data_1 = require("binary-data");
const rx_mini_1 = require("rx.mini");
const debug_1 = tslib_1.__importDefault(require("debug"));
const extendedMasterSecret_1 = require("./handshake/extensions/extendedMasterSecret");
const renegotiationIndication_1 = require("./handshake/extensions/renegotiationIndication");
const abstract_1 = require("./cipher/suites/abstract");
const fragment_1 = require("./record/message/fragment");
const receive_1 = require("./record/receive");
const log = debug_1.default("werift/dtls/socket");
class DtlsSocket {
    constructor(options, sessionType) {
        this.options = options;
        this.sessionType = sessionType;
        this.onConnect = new rx_mini_1.Event();
        this.onData = new rx_mini_1.Event();
        this.onClose = new rx_mini_1.Event();
        this.transport = new transport_1.TransportContext(this.options.transport);
        this.cipher = new cipher_1.CipherContext(this.sessionType, this.options.cert, this.options.key, this.options.signatureHash);
        this.dtls = new dtls_1.DtlsContext(this.options, this.sessionType);
        this.srtp = new srtp_1.SrtpContext();
        this.extensions = [];
        this.onHandleHandshakes = () => { };
        this.bufferFragmentedHandshakes = [];
        this.udpOnMessage = (data) => {
            const packets = receive_1.parsePacket(data);
            for (const packet of packets) {
                try {
                    const message = receive_1.parsePlainText(this.dtls, this.cipher)(packet);
                    switch (message.type) {
                        case const_1.ContentType.handshake:
                            {
                                const handshake = message.data;
                                const handshakes = this.handleFragmentHandshake([handshake]);
                                const assembled = Object.values(handshakes.reduce((acc, cur) => {
                                    if (!acc[cur.msg_type])
                                        acc[cur.msg_type] = [];
                                    acc[cur.msg_type].push(cur);
                                    return acc;
                                }, {}))
                                    .map((v) => fragment_1.FragmentedHandshake.assemble(v))
                                    .sort((a, b) => a.msg_type - b.msg_type);
                                this.onHandleHandshakes(assembled);
                            }
                            break;
                        case const_1.ContentType.applicationData:
                            {
                                this.onData.execute(message.data);
                            }
                            break;
                        case const_1.ContentType.alert:
                            this.onClose.execute();
                            break;
                    }
                }
                catch (error) {
                    log("error", error);
                }
            }
        };
        this.send = async (buf) => {
            const pkt = builder_1.createPlaintext(this.dtls)([{ type: const_1.ContentType.applicationData, fragment: buf }], ++this.dtls.recordSequenceNumber)[0];
            await this.transport.send(this.cipher.encryptPacket(pkt).serialize());
        };
        this.setupExtensions();
        this.transport.socket.onData = this.udpOnMessage;
    }
    setupExtensions() {
        {
            log("support srtpProfiles", this.options.srtpProfiles);
            if (this.options.srtpProfiles && this.options.srtpProfiles.length > 0) {
                const useSrtp = useSrtp_1.UseSRTP.create(this.options.srtpProfiles, Buffer.from([0x00]));
                this.extensions.push(useSrtp.extension);
            }
        }
        {
            const curve = ellipticCurves_1.EllipticCurves.createEmpty();
            curve.data = Object.values(const_2.NamedCurveAlgorithm);
            this.extensions.push(curve.extension);
        }
        {
            const signature = signature_1.Signature.createEmpty();
            // libwebrtc/OpenSSL require 4=1 , 4=3 signatureHash
            signature.data = [
                { hash: const_2.HashAlgorithm.sha256, signature: const_2.SignatureAlgorithm.rsa },
                { hash: const_2.HashAlgorithm.sha256, signature: const_2.SignatureAlgorithm.ecdsa },
            ];
            this.extensions.push(signature.extension);
        }
        {
            if (this.options.extendedMasterSecret) {
                this.extensions.push({
                    type: extendedMasterSecret_1.ExtendedMasterSecret.type,
                    data: Buffer.alloc(0),
                });
            }
        }
        {
            const renegotiationIndication = renegotiationIndication_1.RenegotiationIndication.createEmpty();
            this.extensions.push(renegotiationIndication.extension);
        }
    }
    handleFragmentHandshake(messages) {
        let handshakes = messages.filter((v) => {
            // find fragmented
            if (v.fragment_length !== v.length) {
                this.bufferFragmentedHandshakes.push(v);
                return false;
            }
            return true;
        });
        if (this.bufferFragmentedHandshakes.length > 1) {
            const last = this.bufferFragmentedHandshakes.slice(-1)[0];
            if (last.fragment_offset + last.fragment_length === last.length) {
                handshakes = [...this.bufferFragmentedHandshakes, ...handshakes];
                this.bufferFragmentedHandshakes = [];
            }
        }
        return handshakes; // return un fragmented handshakes
    }
    close() {
        this.transport.socket.close();
    }
    extractSessionKeys() {
        const keyLen = 16;
        const saltLen = 14;
        const keyingMaterial = this.exportKeyingMaterial("EXTRACTOR-dtls_srtp", keyLen * 2 + saltLen * 2);
        const { clientKey, serverKey, clientSalt, serverSalt } = binary_data_1.decode(keyingMaterial, {
            clientKey: binary_data_1.types.buffer(keyLen),
            serverKey: binary_data_1.types.buffer(keyLen),
            clientSalt: binary_data_1.types.buffer(saltLen),
            serverSalt: binary_data_1.types.buffer(saltLen),
        });
        if (this.sessionType === abstract_1.SessionType.CLIENT) {
            return {
                localKey: clientKey,
                localSalt: clientSalt,
                remoteKey: serverKey,
                remoteSalt: serverSalt,
            };
        }
        else {
            return {
                localKey: serverKey,
                localSalt: serverSalt,
                remoteKey: clientKey,
                remoteSalt: clientSalt,
            };
        }
    }
    exportKeyingMaterial(label, length) {
        return prf_1.exportKeyingMaterial(label, length, this.cipher.masterSecret, this.cipher.localRandom.serialize(), this.cipher.remoteRandom.serialize(), this.sessionType === abstract_1.SessionType.CLIENT);
    }
}
exports.DtlsSocket = DtlsSocket;
//# sourceMappingURL=socket.js.map