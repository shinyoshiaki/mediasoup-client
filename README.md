# mediasoup-client-node [WIP]

Node.js client side (not browser,just node.js) library for building [mediasoup][mediasoup-website] based applications.

Using [werift-webrtc](https://github.com/shinyoshiaki/werift-webrtc) for webrtc protocol stack

## Installation

`npm install msc-node`

requires at least Node.js 14

## Usage Example

```js
import {
  Device,
  RTCRtpCodecParameters,
  useAbsSendTime,
  useFIR,
  useNACK,
  usePLI,
  useREMB,
  useSdesMid,
  MediaStreamTrack,
} from "msc-node";
import { exec } from "child_process";
import { createSocket } from "dgram";
import mySignaling from "./my-signaling"; // Our own signaling stuff.

// Create a device with RtpCapabilities
const device = new Device({
  headerExtensions: {
    video: [useSdesMid(), useAbsSendTime()],
  },
  codecs: {
    video: [
      new RTCRtpCodecParameters({
        mimeType: "video/VP8",
        clockRate: 90000,
        payloadType: 98,
        rtcpFeedback: [useFIR(), useNACK(), usePLI(), useREMB()],
      }),
    ],
  },
});

// Communicate with our server app to retrieve router RTP capabilities.
const routerRtpCapabilities = await mySignaling.request(
  "getRouterCapabilities"
);

// Load the device with the router RTP capabilities.
await device.load({ routerRtpCapabilities });

// Check whether we can produce video to the router.
if (!device.canProduce("video")) {
  console.warn("cannot produce video");

  // Abort next steps.
}

// Create a transport in the server for sending our media through it.
const { id, iceParameters, iceCandidates, dtlsParameters, sctpParameters } =
  await mySignaling.request("createTransport", {
    sctpCapabilities: device.sctpCapabilities,
  });

// Create the local representation of our server-side transport.
const sendTransport = device.createSendTransport({
  id,
  iceParameters,
  iceCandidates,
  dtlsParameters,
  sctpParameters,
});

// Set transport "connect" event handler.
sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
  // Here we must communicate our local parameters to our remote transport.
  try {
    await mySignaling.request("transport-connect", {
      transportId: sendTransport.id,
      dtlsParameters,
    });

    // Done in the server, tell our transport.
    callback();
  } catch (error) {
    // Something was wrong in server side.
    errback(error);
  }
});

// Set transport "produce" event handler.
sendTransport.on(
  "produce",
  async ({ kind, rtpParameters, appData }, callback, errback) => {
    // Here we must communicate our local parameters to our remote transport.
    try {
      const { id } = await mySignaling.request("produce", {
        transportId: sendTransport.id,
        kind,
        rtpParameters,
        appData,
      });

      // Done in the server, pass the response to our transport.
      callback({ id });
    } catch (error) {
      // Something was wrong in server side.
      errback(error);
    }
  }
);

// Set transport "producedata" event handler.
sendTransport.on(
  "producedata",
  async (
    { sctpStreamParameters, label, protocol, appData },
    callback,
    errback
  ) => {
    // Here we must communicate our local parameters to our remote transport.
    try {
      const { id } = await mySignaling.request("produceData", {
        transportId: sendTransport.id,
        sctpStreamParameters,
        label,
        protocol,
        appData,
      });

      // Done in the server, pass the response to our transport.
      callback({ id });
    } catch (error) {
      // Something was wrong in server side.
      errback(error);
    }
  }
);

// Produce our rtp video.
exec(
  "ffmpeg -re -f lavfi -i testsrc=size=640x480:rate=30 -vcodec libvpx -cpu-used 5 -deadline 1 -g 10 -error-resilient 1 -auto-alt-ref 1 -f rtp rtp://127.0.0.1:5030"
);
const udp = createSocket("udp4");
udp.bind(5030);
const rtpTrack = new MediaStreamTrack({ kind: "video" });
udp.addListener("message", (data) => {
  rtpTrack.writeRtp(data);
});
const rtpProducer = await sendTransport.produce({ track: rtpTrack });

// Produce data (DataChannel).
const dataProducer = await sendTransport.produceData({
  ordered: true,
  label: "foo",
});

...

const consumer = await recvTransport.consume({
  id,
  producerId,
  kind,
  rtpParameters,
});
consumer.track.onReceiveRtp.subscribe((rtp) => {
  // send rtp packet
  udp.send(rtp.serialize(), 4002);
});
```

## Authors

- shinyoshiaki [[github](https://github.com/shinyoshiaki/)]

## Original Authors

- Iñaki Baz Castillo [[website](https://inakibaz.me)|[github](https://github.com/ibc/)]
- José Luis Millán [[github](https://github.com/jmillan/)]

## License

[ISC](./LICENSE)

## Original License

- https://github.com/versatica/mediasoup-client

```
ISC License

Copyright © 2015, Iñaki Baz Castillo <ibc@aliax.net>
```

[mediasoup-website]: https://mediasoup.org
[mediasoup-discourse]: https://mediasoup.discourse.group
[npm-shield-mediasoup-client]: https://img.shields.io/npm/v/mediasoup-client.svg
[npm-mediasoup-client]: https://npmjs.org/package/mediasoup-client
[travis-ci-shield-mediasoup-client]: https://travis-ci.com/versatica/mediasoup-client.svg?branch=master
[travis-ci-mediasoup-client]: https://travis-ci.com/versatica/mediasoup-client
