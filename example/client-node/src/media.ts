import io from "socket.io-client";
import { createSocket } from "dgram";
import { Client } from "./client";
import { MediaStreamTrack } from "../../../src";

// ffmpeg -re -f lavfi -i testsrc=size=640x480:rate=30 -vcodec libvpx -cpu-used 5 -deadline 1 -g 10 -error-resilient 1 -auto-alt-ref 1 -f rtp rtp://127.0.0.1:5000
// gst-launch-1.0 videotestsrc ! video/x-raw,width=640,height=480,format=I420 ! vp8enc error-resilient=partitions keyframe-max-dist=10 auto-alt-ref=true cpu-used=5 deadline=1 ! rtpvp8pay ! udpsink host=127.0.0.1 port=5000
// gst-launch-1.0 -v udpsrc port=4002 caps = "application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)VP8, payload=(int)97" ! rtpvp8depay ! decodebin ! videoconvert ! autovideosink

const udp = createSocket("udp4");
udp.bind(5000);
const socket = io.connect("http://127.0.0.1:20000");

console.log("start");
socket.on("connect", async () => {
  console.log("connected");

  socket.emit("join");
  await new Promise((r) => socket.on("join", r));
  console.log("joined");

  const client = await new Client(socket).init();
  await client.setupConsumerTransport();
  await client.setupProducerTransport();

  client.onProduceMedia.subscribe(async (target) => {
    const consumer = await client.consume(target);
    const track = consumer.track as unknown as MediaStreamTrack;
    track.onReceiveRtp.subscribe((rtp) => {
      udp.send(rtp.serialize(), 4002);
    });
  });

  const track = new MediaStreamTrack({ kind: "video" });
  await client.publishMedia(track as any);
  udp.addListener("message", (data) => {
    track.writeRtp(data);
  });
});
