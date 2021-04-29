import React, { FC, useState } from "react";

const RadioBox: FC<{ onChange: (b: boolean) => void; initial?: boolean }> = ({
  onChange,
  initial
}) => {
  const [on, seton] = useState(initial || false);

  const change = () => {
    seton(!on);
    onChange(!on);
  };

  return (
    <div>
      <input type="radio" checked={!on} onChange={change} />
      off
      <input type="radio" checked={on} onChange={change} />
      on
    </div>
  );
};

export default RadioBox;
