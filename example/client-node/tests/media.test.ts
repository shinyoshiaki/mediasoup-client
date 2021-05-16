import { exec } from "child_process";
import { createSocket } from "dgram";
import { Client } from "../src/client";
import io from "socket.io-client";
import { socketPromise } from "../src/socket.io-promise";
import { MediaStreamTrack } from "../../../src";

describe("media", () => {
  test("produce consume", async (done) => {
    const child = exec(
      "ffmpeg -re -f lavfi -i testsrc=size=640x480:rate=30 -vcodec libvpx -cpu-used 5 -deadline 1 -g 10 -error-resilient 1 -auto-alt-ref 1 -f rtp rtp://127.0.0.1:5030"
    );

    const udp = createSocket("udp4");
    udp.bind(5030);
    const socket = io.connect("http://127.0.0.1:20000");

    await socketPromise(socket)("join");

    const client = await new Client(socket).init();
    await client.setupConsumerTransport();
    await client.setupProducerTransport();

    client.onProduceMedia.subscribe(async (target) => {
      const track = (await client.consume(target)).track;
      expect(client.recvTransport.pc.transceivers.length).toBe(2); // mid 0 & mid probator
      (track as unknown as MediaStreamTrack).onReceiveRtp.subscribe(
        async (rtp) => {
          try {
            process.kill(child.pid + 1);
          } catch (error) {}
          socket.close();
          await new Promise((r) => setTimeout(r, 500));
          done();
        }
      );
    });

    const track = new MediaStreamTrack({ kind: "video" });
    await client.publishMedia(track as any);

    expect(client.sendTransport.pc.transceivers.length).toBe(1);

    udp.addListener("message", (data) => {
      track.writeRtp(data);
    });
  });

  test("produce consume unconsume", async (done) => {
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
      done();
    });

    const track = new MediaStreamTrack({ kind: "video" });
    await client.publishMedia(track as any);
    expect(client.sendTransport.pc.transceivers.length).toBe(1);
  });
});
