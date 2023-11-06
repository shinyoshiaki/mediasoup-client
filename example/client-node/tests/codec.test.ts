import {
  MediaStreamTrackFactory,
  RTCRtpCodecParameters,
  useNACK,
  usePLI,
  useREMB,
} from "werift";
import ffmpeg from "fluent-ffmpeg";
import { socketPromise } from "../src/socket.io-promise";
import { Client } from "../src/client";
import { waitFor } from "./fixture";
import io from "socket.io-client";

describe("codec", () => {
  describe("h264", () => {
    test("parameter", async () =>
      new Promise<void>(async (done) => {
        const socket = io.connect("http://127.0.0.1:20000");

        await socketPromise(socket)("join");

        const client = await new Client(socket, 
            {
          codecs: {
            video: [
              new RTCRtpCodecParameters({
                mimeType: "video/H264",
                clockRate: 90000,
                rtcpFeedback: [useNACK(), usePLI(), useREMB()],
                parameters:
                  "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f",
              }),
            ],
          },
        }
        ).init();
        await client.setupConsumerTransport();
        await client.setupProducerTransport();

        client.onProduceMedia.subscribe(async (target) => {
          const consumer = await client.consume(target);
          const track = consumer.track;

          track.onReceiveRtp.subscribe(async (rtp) => {
            try {
              dispose();
              child.kill("SIGKILL");
            } catch (error) {}
            socket.close();
            await new Promise((r) => setTimeout(r, waitFor));
            done();
          });
        });

        const [track, port, dispose] = await MediaStreamTrackFactory.rtpSource({
          kind: "video",
        });

        const child = ffmpeg()
          .input("testsrc=size=640x480:rate=30")
          .inputFormat("lavfi")
          .videoCodec("libx264")
          .addOptions(["-preset ultrafast"])
          .toFormat("rtp")
          .save(`rtp://127.0.0.1:${port}`)
          .on("error", () => {});

        await client.publishMedia(track);
      }));
  });
});
