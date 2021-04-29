import { useEffect } from "react";

export function useAsyncEffect(fn: () => void, deps?: any[]) {
  useEffect(() => {
    fn();
  }, deps);
}
