import React, { FC, useRef, useState } from "react";
import { Client } from "./webrtc/client";
import { getLocalVideo } from "webrtc4me";
import Videos from "./components/videos";
import Event from "rx.mini";
import { socketPromise } from "./webrtc/socket.io-promise";
import { signaling } from "./webrtc/signaling";

const APP: FC = () => {
  const clientRef = useRef<Client>(null);
  const mediaEventRef = useRef({ stream: new Event<MediaStream[]>() });

  const join = async () => {
    console.log("join");
    const mediaEvent = mediaEventRef.current;
    signaling.socket.emit("join");
    await new Promise((r) => signaling.socket.on("join", r));
    console.log("on join");
    const client = await new Client(signaling.socket).connect();
    clientRef.current = client;

    client.onSubscribe.subscribe((stream) => {
      mediaEvent.stream.execute([stream]);
    });
    const targets: string[] = await socketPromise(signaling.socket)(
      "producerTransportList"
    );
    const streams = await Promise.all(
      targets.map((target) => client.subscribe(target))
    );
    mediaEvent.stream.execute(streams);

    const stream = await getLocalVideo();
    console.log("localstream");
    await client.publish(stream);
    mediaEvent.stream.execute([stream]);
  };

  return (
    <div>
      <button onClick={join}>join</button>
      <Videos streamEvent={mediaEventRef.current.stream} />
    </div>
  );
};

export default APP;
