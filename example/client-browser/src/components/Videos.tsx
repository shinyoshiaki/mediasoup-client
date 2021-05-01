import { FC, useEffect, useState, useRef } from "react";
import Event from "rx.mini";

const Videos: FC<{ streamEvent: Event<[MediaStream[]]> }> = ({
  streamEvent,
}) => {
  const [streams, setstreams] = useState<MediaStream[]>([]);
  const videos = useRef<HTMLVideoElement[]>([]);

  useEffect(() => {
    streamEvent.subscribe((stream) => {
      setstreams((prev) => [...prev, ...stream]);
    });
  }, []);

  useEffect(() => {
    videos.current.forEach((v, i) => (v.srcObject = streams[i]));
  }, [streams]);

  return (
    <div style={{ display: "flex" }}>
      {streams.map((_, i) => (
        <div key={i} style={{ width: 100, margin: 20 }}>
          video{i}
          <video
            ref={(ref) => {
              const arr = videos.current;
              arr[i] = ref;
              videos.current = arr;
            }}
            autoPlay
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ))}
    </div>
  );
};

export default Videos;
