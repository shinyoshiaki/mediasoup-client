import React, { FC, useEffect, useRef } from "react";

import useFile from "../../hooks/useFile";
import WebRTC, { SendFile } from "webrtc4me";

const NewFileApi: FC<{ peer?: WebRTC }> = ({ peer }) => {
  const stateRef = useRef({ sendfile: undefined as undefined | SendFile });
  const [_, setFile, onSetFile] = useFile();

  useEffect(() => {
    if (!peer) return;
    const state = stateRef.current;
    state.sendfile = new SendFile(peer);
    stateRef.current = state;
  }, [peer]);

  onSetFile(async file => {
    const { sendfile } = stateRef.current;
    sendfile.send(file);
  });

  return (
    <div>
      <p>new file api</p>
      <input type="file" onChange={setFile} />
    </div>
  );
};

export default NewFileApi;
