import { FC, useRef } from "react";
import { Client } from "./webrtc/client";
import Videos from "./components/Videos";
import Event from "rx.mini";
import { socketPromise } from "./webrtc/socket.io-promise";
import { signaling } from "./webrtc/signaling";
import { DataProducer } from "mediasoup-client/lib/DataProducer";

const APP: FC = () => {
  const clientRef = useRef<Client>(null);
  const producerRef = useRef<DataProducer>();
  const mediaEventRef = useRef({ stream: new Event<[MediaStream[]]>() });

  const connect = async () => {
    console.log("join");
    const mediaEvent = mediaEventRef.current;

    signaling.socket.emit("join");
    await new Promise((r) => signaling.socket.on("join", r));
    console.log("on join");
    const client = await new Client(signaling.socket).connect();
    clientRef.current = client;

    await client.setupConsumerTransport();
    console.log("setup ConsumerTransport done");
    await client.setupProducerTransport();
    console.log("setup ProducerTransport done");

    client.onSubscribeMedia.subscribe((stream) => {
      mediaEvent.stream.execute(stream);
    });
    client.onSubscribeData.subscribe((consumer) => {
      consumer.on("message", (data) => {
        console.log({ data });
      });
    });

    {
      const targets: string[] = await socketPromise(signaling.socket)(
        "producerList"
      );
      const streams = await Promise.all(
        targets.map((target) => client.consume(target))
      );
      mediaEvent.stream.execute(streams);
    }

    {
      const targets: string[] = await socketPromise(signaling.socket)(
        "dataProducerList"
      );
      targets.forEach(async (target) => {
        const consumer = await client.consumeData(target);
        consumer.on("message", (data) => {
          console.log({ data });
        });
      });
    }
    console.log("localstream");
  };

  const publishMedia = async () => {
    const client = clientRef.current;
    const [track] = (
      await navigator.mediaDevices.getUserMedia({
        video: true,
      })
    ).getTracks();
    await client.publishMedia(track);
  };

  const publish = async () => {
    const client = clientRef.current;
    producerRef.current = await client.publishData();
  };

  const send = () => {
    const producer = producerRef.current;
    producer.send("test");
  };

  return (
    <div>
      <button onClick={connect}>connect</button>
      <button onClick={publishMedia}>publish video</button>
      <Videos streamEvent={mediaEventRef.current.stream} />
      <button onClick={publish}>publish data</button>
      <button onClick={send}>send</button>
    </div>
  );
};

export default APP;
