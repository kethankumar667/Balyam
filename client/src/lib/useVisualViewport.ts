import { useEffect, useState } from "react";

export interface VisualViewportState {
  height: number;
  width: number;
  offsetTop: number;
  offsetLeft: number;
  scale: number;
  isKeyboardOpen: boolean;
}

/**
 * Tracks window.visualViewport live to ensure mobile modals, drawers, and
 * chat inputs adapt immediately when the software keyboard opens or closes,
 * or when browser toolbars shrink/expand on iOS Safari and Android Chrome.
 */
export function useVisualViewport(): VisualViewportState {
  const getInitialState = (): VisualViewportState => {
    if (typeof window === "undefined") {
      return {
        height: 800,
        width: 375,
        offsetTop: 0,
        offsetLeft: 0,
        scale: 1,
        isKeyboardOpen: false,
      };
    }
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    const width = vv ? vv.width : window.innerWidth;
    const offsetTop = vv ? vv.offsetTop : 0;
    const offsetLeft = vv ? vv.offsetLeft : 0;
    const scale = vv ? vv.scale : 1;
    const isKeyboardOpen = window.innerHeight - height > 150;
    return { height, width, offsetTop, offsetLeft, scale, isKeyboardOpen };
  };

  const [state, setState] = useState<VisualViewportState>(getInitialState);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    const update = () => {
      const height = vv ? vv.height : window.innerHeight;
      const width = vv ? vv.width : window.innerWidth;
      const offsetTop = vv ? vv.offsetTop : 0;
      const offsetLeft = vv ? vv.offsetLeft : 0;
      const scale = vv ? vv.scale : 1;
      const isKeyboardOpen = window.innerHeight - height > 150;

      setState({
        height,
        width,
        offsetTop,
        offsetLeft,
        scale,
        isKeyboardOpen,
      });
    };

    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
    }
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    update();

    return () => {
      if (vv) {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      }
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return state;
}
