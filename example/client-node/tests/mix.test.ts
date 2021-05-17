import { exec } from "child_process";
import { createSocket } from "dgram";
import io from "socket.io-client";
import { Client } from "../src/client";
import { socketPromise } from "../src/socket.io-promise";
import { Counter, waitFor } from "./fixture";
import {
  MediaStreamTrack,
  RTCRtpCodecParameters,
  RtpBuilder,
  useFIR,
  useNACK,
  usePLI,
  useREMB,
} from "../../../src";

describe("mix", () => {
  test("produce produce(data) produce(audio) consume consume", async (done) => {
    const child = exec(
      "ffmpeg -re -f lavfi -i testsrc=size=640x480:rate=30 -vcodec libvpx -cpu-used 5 -deadline 1 -g 10 -error-resilient 1 -auto-alt-ref 1 -f rtp rtp://127.0.0.1:5030"
    );
    const udp = createSocket("udp4");
    udp.bind(5030);
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
      expect(client.recvTransport.pc.transceivers.length).toBe(3);
      socket.close();
      try {
        udp.close();
        process.kill(child.pid + 1);
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
        done();
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
      const audioRtp = new RtpBuilder();
      setInterval(() => {
        const rtp = audioRtp.create(Buffer.from("audio"));
        track.writeRtp(rtp);
      }, 1000 / 30);
    }

    expect(client.sendTransport.pc.transceivers.length).toBe(2);
    counter.done();
  }, 10_000);
});
