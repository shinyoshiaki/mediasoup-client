import { socketPromise } from "./socket.io-promise";
import io from "socket.io-client";
import { createSocket } from "dgram";
import { Client } from "./client";
import { MediaStreamTrack } from "werift";

// gst-launch-1.0 -v udpsrc port=4002 caps = "application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)VP8, payload=(int)97" ! rtpvp8depay ! decodebin ! videoconvert ! autovideosink
const udp = createSocket("udp4");

const socket = io.connect("http://127.0.0.1:20000");

console.log("start");
socket.on("connect", async () => {
  console.log("connected");

  socket.emit("join");
  await new Promise((r) => socket.on("join", r));
  console.log("joined");

  const client = await new Client(socket).connect();
  await client.setupConsumerTransport();
  await client.setupProducerTransport();

  {
    const targets = await socketPromise(socket)("producerList");
    console.log("media targets", targets);
    if (targets[0]) {
      const track: MediaStreamTrack = (await client.consume(targets[0])) as any;
      track.onReceiveRtp.subscribe((rtp) => {
        udp.send(rtp.serialize(), 4002);
      });
    }
  }

  {
    const targets = await socketPromise(socket)("dataProducerList");
    console.log("data targets", targets);
    if (targets[0]) {
      const consumer = await client.consumeData(targets[0]);
      consumer.on("message", (data) => {
        console.log({ data });
      });
    }
  }
});
