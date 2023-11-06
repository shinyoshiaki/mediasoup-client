import ffmpeg from "fluent-ffmpeg";
import { createSocket } from "dgram";
import io from "socket.io-client";
import {
  Client,
  MediaStreamTrack,
  RTCRtpCodecParameters,
  RtpBuilder,
  useFIR,
  useNACK,
  usePLI,
  useREMB,
  randomPort,
} from "../src/client";
import { socketPromise } from "../src/socket.io-promise";
import { Counter, waitFor } from "./fixture";

describe("mix", () => {
  test(
    "produce produce(data) produce(audio) consume consume",
    async () =>
      new Promise<void>(async (done) => {
        const port = await randomPort();
        const child = ffmpeg()
          .input("testsrc=size=640x480:rate=30")
          .inputFormat("lavfi")
          .videoCodec("libvpx")
          .addOptions([
            "-cpu-used 5",
            "-deadline 1",
            "-g 10",
            "-error-resilient 1",
            "-auto-alt-ref 1",
          ])
          .toFormat("rtp")
          .save(`rtp://127.0.0.1:${port}/input.mpg`)
          .on("error", () => {});

        const udp = createSocket("udp4");
        udp.bind(port);
        const socket = io.connect("http://127.0.0.1:20000");

        await socketPromise(socket)("join");

        const client = await new Client(socket, {
          codecs: {
            video: [
              new RTCRtpCodecParameters({
                mimeType: "video/VP8",
                clockRate: 90000,
                rtcpFeedback: [useFIR(), useNACK(), usePLI(), useREMB()],
              }),
            ],
            audio: [
              new RTCRtpCodecParameters({
                mimeType: "audio/opus",
                clockRate: 48000,
                channels: 2,
              }),
            ],
          },
          headerExtensions: {},
        }).init();
        await client.setupConsumerTransport();
        await client.setupProducerTransport();

        const counter = new Counter(4, async () => {
          expect(client.recvTransport.pc.getTransceivers().length).toBe(3);
          socket.close();
          try {
            udp.close();
            child.kill("SIGKILL");
          } catch (error) {}
          await new Promise((r) => setTimeout(r, waitFor));
          done();
        });

        client.onProduceMedia.subscribe(async (target) => {
          const consumer = await client.consume(target);
          const track = consumer.track;
          track.onReceiveRtp.once((rtp) => {
            if (track.kind === "audio") {
              expect(rtp.payload.toString()).toBe("audio");
            } else {
              expect(rtp.payload).toBeTruthy();
            }
            counter.done();
          });
        });
        client.onProduceData.subscribe(async (target) => {
          const consumer = await client.consumeData(target);
          consumer.on("message", async (data) => {
            expect(data).toBe("data");
            socket.close();
            await new Promise((r) => setTimeout(r, waitFor));
            counter.done();
          });
        });

        {
          const track = new MediaStreamTrack({ kind: "video" });
          await client.publishMedia(track as any);
          udp.addListener("message", (data) => {
            track.writeRtp(data);
          });
        }
        {
          const producer = await client.publishData();
          setInterval(() => {
            producer.send("data");
          }, 100);
        }
        {
          const track = new MediaStreamTrack({ kind: "audio" });
          await client.publishMedia(track as any);
          const audioRtp = new RtpBuilder({between:20, clockRate:48000});
          setInterval(() => {
            const rtp = audioRtp.create(Buffer.from("audio"));
            track.writeRtp(rtp);
          }, 20);
        }

        expect(client.sendTransport.pc.getTransceivers().length).toBe(2);
        counter.done();
      }),
    10_000
  );
});
