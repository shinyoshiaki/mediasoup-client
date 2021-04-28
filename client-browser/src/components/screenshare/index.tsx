import React, { FC } from "react";
import WebRTC from "webrtc4me";
import { getLocalDesktop } from "webrtc4me/lib/utill/media";


const ScreenShare: FC<{ peer?: WebRTC }> = ({ peer }) => {
  const add = async () => {
    if (peer) {
      const stream = await getLocalDesktop();
      peer.addStream(stream);
    }
  };

  return (
    <div>
      <p>screen share</p>
      <button onClick={add}>add screen</button>
    </div>
  );
};

export default ScreenShare;
