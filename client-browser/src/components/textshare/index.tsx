import React, { FC, useEffect, useState } from "react";
import WebRTC from "webrtc4me";


const TextShare: FC<{ peer?: WebRTC }> = ({ peer }) => {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!peer) return;
    peer.onData.subscribe(raw => {
      if (raw.label === "share") setText(raw.data as any);
    });
  });

  return (
    <div>
      <p>datachannel</p>
      <input
        value={text}
        onChange={e => {
          setText(e.target.value);
          if (peer) peer.send(e.target.value, "share");
        }}
        style={{ width: "40vw" }}
      />
    </div>
  );
};

export default TextShare;
