import { exec } from "child_process";
import { createSocket } from "dgram";
import { Client } from "../src/client";
import io from "socket.io-client";
import { socketPromise } from "../src/socket.io-promise";
import {
  MediaStreamTrack,
  randomPort,
  RTCRtpCodecParameters,
  RtpBuilder,
  useFIR,
  useNACK,
  usePLI,
  useREMB,
} from "../../../src";
import { Counter, waitFor } from "./fixture";

describe("media", () => {
  test("produce consume", async()=>new Promise<void>(async (done) => {
    const port=await randomPort()

    const child = exec(
      `ffmpeg -re -f lavfi -i testsrc=size=640x480:rate=30 -vcodec libvpx -cpu-used 5 -deadline 1 -g 10 -error-resilient 1 -auto-alt-ref 1 -f rtp rtp://127.0.0.1:${port}`
    );
    const udp = createSocket("udp4");
    udp.bind(port);
    const socket = io.connect("http://127.0.0.1:20000");

    await socketPromise(socket)("join");

    const client = await new Client(socket).init();
    await client.setupConsumerTransport();
    await client.setupProducerTransport();

    client.onProduceMedia.subscribe(async (target) => {
      const track = (await client.consume(target)).track;
      expect(client.recvTransport.pc.transceivers.length).toBe(2); // mid 0 & mid probator
      track.onReceiveRtp.subscribe(async () => {
        try {
          udp.close();
          process.kill(child.pid + 1);
        } catch (error) {}
        socket.close();
        await new Promise((r) => setTimeout(r, waitFor));
        done();
      });
    });

    const track = new MediaStreamTrack({ kind: "video" });
    await client.publishMedia(track as any);
    udp.addListener("message", (data) => {
      track.writeRtp(data);
    });

    expect(client.sendTransport.pc.transceivers.length).toBe(1);
  }));

  test("produce consume unconsume", async()=>new Promise<void>(async (done) => {
    const socket = io.connect("http://127.0.0.1:20000");

    await socketPromise(socket)("join");

    const client = await new Client(socket).init();
    await client.setupConsumerTransport();
    await client.setupProducerTransport();

    client.onProduceMedia.subscribe(async (target) => {
      const consumer = await client.consume(target);
      expect(
        client.recvTransport.pc.transceivers.map((t) => t.currentDirection)
      ).toEqual(["recvonly", "recvonly"]);
      await client.unConsume(consumer);
      await new Promise((r) => setTimeout(r, 10));
      expect(
        client.recvTransport.pc.transceivers.map((t) => t.currentDirection)
      ).toEqual(["inactive", "recvonly"]);
      socket.close();
      await new Promise((r) => setTimeout(r, waitFor));
      done();
    });

    const track = new MediaStreamTrack({ kind: "video" });
    await client.publishMedia(track as any);
    expect(client.sendTransport.pc.transceivers.length).toBe(1);
  }));

  test("produce(audio) consume", async()=>new Promise<void>(async (done) => {
    const socket = io.connect("http://127.0.0.1:20000");

    await socketPromise(socket)("join");

    const client = await new Client(socket, {
      codecs: {
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

    client.onProduceMedia.subscribe(async (target) => {
      const consumer = await client.consume(target);
      expect(client.recvTransport.pc.transceivers.length).toBe(1);
      consumer.track.onReceiveRtp.subscribe(async (rtp) => {
        expect(rtp.payload.toString()).toBe("audio");
        socket.close();
        await new Promise((r) => setTimeout(r, waitFor));
        done();
      });
    });

    const track = new MediaStreamTrack({ kind: "audio" });
    await client.publishMedia(track as any);
    expect(client.sendTransport.pc.transceivers.length).toBe(1);
    const audioRtp = new RtpBuilder();
    setInterval(() => {
      const rtp = audioRtp.create(Buffer.from("audio"));
      track.writeRtp(rtp);
    }, 1000 / 30);
  }));

  test("produce(audio) produce(audio) consume consume", async()=>new Promise<void>(async (done) => {
    const socket = io.connect("http://127.0.0.1:20000");

    await socketPromise(socket)("join");

    const client = await new Client(socket, {
      codecs: {
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

    const counter = new Counter(3, async () => {
      expect(client.recvTransport.pc.transceivers.length).toBe(2);
      socket.close();
      await new Promise((r) => setTimeout(r, waitFor));
      done();
    });

    let index = 1;
    client.onProduceMedia.subscribe(async (target) => {
      const toBe = index++;
      const consumer = await client.consume(target);
      consumer.track.onReceiveRtp.once((rtp) => {
        expect(rtp.payload.toString()).toBe(toBe.toString());
        counter.done();
      });
    });

    {
      const track = new MediaStreamTrack({ kind: "audio" });
      await client.publishMedia(track as any);
      const audioRtp = new RtpBuilder();
      setInterval(() => {
        const rtp = audioRtp.create(Buffer.from("1"));
        track.writeRtp(rtp);
      }, 1000 / 30);
    }
    {
      const track = new MediaStreamTrack({ kind: "audio" });
      await client.publishMedia(track as any);
      const audioRtp = new RtpBuilder();
      setInterval(() => {
        const rtp = audioRtp.create(Buffer.from("2"));
        track.writeRtp(rtp);
      }, 1000 / 30);
    }

    expect(client.sendTransport.pc.transceivers.length).toBe(2);
    counter.done();
  }));

  test("produce produce(audio) consume consume", async()=>new Promise<void>(async (done) => {
    const port=await randomPort()
    const child = exec(
      `ffmpeg -re -f lavfi -i testsrc=size=640x480:rate=30 -vcodec libvpx -cpu-used 5 -deadline 1 -g 10 -error-resilient 1 -auto-alt-ref 1 -f rtp rtp://127.0.0.1:${port}`
    );
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

    const counter = new Counter(3, async () => {
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
      consumer.track.onReceiveRtp.once((rtp) => {
        if (consumer.track.kind === "audio") {
          expect(rtp.payload.toString()).toBe("audio");
        } else {
          expect(rtp.payload).toBeTruthy();
        }
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
      const track = new MediaStreamTrack({ kind: "audio" });
      await client.publishMedia(track as any);
      const audioRtp = new RtpBuilder();
      setInterval(() => {
        const rtp = audioRtp.create(Buffer.from("audio"));
        track.writeRtp(rtp);
      }, 1000 / 30);
    }

    client;
    expect(client.sendTransport.pc.transceivers.length).toBe(2);
    counter.done();
  }));
});
