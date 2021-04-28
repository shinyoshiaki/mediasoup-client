import { useState } from "react";

export default function useInput(): [
  string,
  (e: { target: { value: string } }) => void,
  () => void
] {
  const [value, setvalue] = useState("");
  const input = (e: any) => {
    setvalue(e.target.value);
  };
  const clear = () => {
    setvalue("");
  };

  return [value, input, clear];
}
