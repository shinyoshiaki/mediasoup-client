import React, { FC, useEffect, useState } from "react";
import useFile from "../../hooks/useFile";
import WebRTC, { FileShare } from "webrtc4me";


const FileShareExample: FC<{ peer?: WebRTC }> = ({ peer }) => {
  const [_, setfile, onSetfile] = useFile();
  const [progress, setprogress] = useState(0);

  useEffect(() => {
    if (peer) {
      const fileshare = new FileShare(peer, "file");
      fileshare.event.subscribe(action => {
        switch (action.type) {
          case "downloaded":
            const { chunks, name } = action.payload;
            const blob = new Blob(chunks);
            const url = window.URL.createObjectURL(blob);
            console.log({ url });
            const anchor = document.createElement("a");
            anchor.download = name;
            anchor.href = url;
            anchor.click();
            break;
          case "downloading":
            {
              const { now, size } = action.payload;
              setprogress((now / size) * 100);
            }
            break;
        }
      });
    }
  }, [peer]);

  onSetfile(f => {
    if (peer) {
      const fileshare = new FileShare(peer, "file");
      fileshare.send(f);
    }
  });

  return (
    <div>
      <p>fileshare</p>
      <input type="file" onChange={setfile} />
      <p>{progress}%</p>
    </div>
  );
};

export default FileShareExample;
