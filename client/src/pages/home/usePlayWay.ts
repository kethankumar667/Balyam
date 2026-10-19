import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PLAY_WAY_QUERY_PARAM,
  isPlayWay,
  readStoredWay,
  resolveInitialWay,
  storeWay,
  type PlayWay,
} from "./playWay";

/**
 * The visitor's current "way", kept in three places that each do one job:
 *
 *  - React state is what the page renders from.
 *  - The URL (`?way=`) makes it linkable and survives a refresh. It is written
 *    with `replace`, so choosing a way never adds a back-button step.
 *  - localStorage remembers it for the next visit.
 *
 * A link parameter beats the remembered choice because following a link is an
 * explicit request. It is not itself remembered: only a deliberate tap on the
 * cards is, so a shared link cannot rewrite someone's default.
 */
export function usePlayWay(): readonly [PlayWay | null, (next: PlayWay | null) => void] {
  const [params, setParams] = useSearchParams();
  const urlWay = params.get(PLAY_WAY_QUERY_PARAM);
  const [way, setWay] = useState<PlayWay | null>(() =>
    resolveInitialWay(urlWay, readStoredWay()),
  );

  // A link to `/?way=solo` clicked while already on the home page changes the
  // URL without remounting, so state has to follow it.
  useEffect(() => {
    if (isPlayWay(urlWay)) setWay(urlWay);
  }, [urlWay]);

  const choose = useCallback(
    (next: PlayWay | null) => {
      setWay(next);
      storeWay(next);
      const nextParams = new URLSearchParams(params);
      if (next === null) nextParams.delete(PLAY_WAY_QUERY_PARAM);
      else nextParams.set(PLAY_WAY_QUERY_PARAM, next);
      setParams(nextParams, { replace: true });
    },
    [params, setParams],
  );

  return [way, choose] as const;
}
