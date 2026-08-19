import { useEffect, type ReactNode } from "react";
import { recoveryManager } from "./RecoveryManager";
import RecoveryBanner from "./RecoveryBanner";

export function RecoveryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    recoveryManager.init();
  }, []);

  return (
    <>
      <RecoveryBanner />
      {children}
    </>
  );
}
