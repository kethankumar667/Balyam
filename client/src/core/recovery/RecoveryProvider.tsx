import { useEffect, type ReactNode } from "react";
import { recoveryManager } from "./RecoveryManager";
import RecoveryBanner from "./RecoveryBanner";
import RejoinBanner from "./RejoinBanner";
import OfflineBanner from "../../components/games/OfflineBanner";

export function RecoveryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    recoveryManager.init();
  }, []);

  return (
    <>
      <OfflineBanner />
      <RecoveryBanner />
      <RejoinBanner />
      {children}
    </>
  );
}
