import { MediaKind } from "mediasoup/lib/types";

const config = {
  listenIp: "0.0.0.0",
  listenPort: 3000,
  sslCrt: "cert.pem",
  sslKey: "rsa.key",
  mediasoup: {
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: "warn",
      logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
    },
    router: {
      mediaCodecs: [
        {
          kind: "audio" as MediaKind,
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: "video" as MediaKind,
          mimeType: "video/VP8",
          clockRate: 90000,
          parameters: {
            "x-google-start-bitrate": 1000,
          },
        },
      ],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: "127.0.0.1",
          announcedIp: null,
        },
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },
};

export default config;
