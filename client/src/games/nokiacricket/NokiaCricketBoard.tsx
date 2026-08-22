import { memo, lazy, Suspense } from "react";
import { useViewport } from "../../lib/useViewport";
import type { NokiaCricketBoardProps } from "./NokiaCricketBoardMobile";

const NokiaCricketBoardMobile = lazy(() => import("./NokiaCricketBoardMobile"));
const NokiaCricketBoardDesktop = lazy(() => import("./NokiaCricketBoardDesktop"));

function NokiaCricketBoard(props: NokiaCricketBoardProps) {
  const viewport = useViewport();

  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center bg-[#0D1322] text-amber-400 font-mono text-xs">
          Loading Nokia Cricket...
        </div>
      }
    >
      {viewport === "desktop" ? (
        <NokiaCricketBoardDesktop {...props} />
      ) : (
        <NokiaCricketBoardMobile {...props} />
      )}
    </Suspense>
  );
}

export default memo(NokiaCricketBoard);
