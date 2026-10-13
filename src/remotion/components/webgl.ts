import { useMemo } from "react";

/** True when this browser can create a WebGL context (some CI browsers can't). */
export function useWebGL(): boolean {
  return useMemo(() => {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }, []);
}
