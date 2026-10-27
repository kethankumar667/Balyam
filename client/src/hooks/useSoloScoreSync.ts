import { useCallback, useEffect, useRef, useState } from "react";
import type { AllGameSlug } from "@shared/profile/Scorecard";
import { recordSoloScore } from "../store/scorecardStore";

export function useSoloScoreSync() {
  const [syncStatus, setSyncStatus] = useState("");
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; };
  }, []);
  const reset = useCallback(() => { generation.current++; setSyncStatus(""); }, []);
  const save = useCallback((game: AllGameSlug, modeId: string, score: number, metrics?: Record<string, number | string>) => {
    const attempt = ++generation.current;
    const publish = (status: string) => {
      if (mounted.current && attempt === generation.current) setSyncStatus(status);
    };
    publish("Saving to your account...");
    void recordSoloScore(game, modeId, score, metrics).then(result => {
      publish(result ? "Saved to your account." : "Account save not confirmed. Open My Records to check or retry pending results.");
    }).catch(error => {
      console.warn(`Could not save ${game} account result:`, error);
      publish("Account save failed. Open My Records to retry or import available device bests.");
    });
  }, []);
  return { syncStatus, reset, save };
}
