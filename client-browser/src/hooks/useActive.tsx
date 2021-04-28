import { useEffect, useState } from "react";
import { T } from "ts-toolbelt";

export default function useActive<U extends any[]>(
  fun: (...bind: T.NonNullable<U>) => void,
  ...bind: U
) {
  const [first, setfirst] = useState(true);
  useEffect(() => {
    if (first) {
      const unexist = bind.filter(v => v === undefined || null);
      if (unexist.length === 0) {
        fun(...(bind as any));
        setfirst(false);
      }
    }
  }, [...bind]);
}
