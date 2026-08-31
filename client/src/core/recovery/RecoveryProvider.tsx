import { useEffect, type ReactNode } from "react";
import { recoveryManager } from "./RecoveryManager";
import RecoveryBanner from "./RecoveryBanner";
import RejoinBanner from "./RejoinBanner";

export function RecoveryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    recoveryManager.init();
  }, []);

  return (
    <>
      <RecoveryBanner />
      <RejoinBanner />
      {children}
    </>
  );
}
