import { useEffect, useState } from "react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { MiniclipXPProgression } from "@shared/progression/MiniclipProgression";
import { apiJson } from "../lib/playerIdentity";

/**
 * A group member's game record: the career totals and the XP level the leaderboards already show.
 *
 * Both routes are public and read-only on the server (a leaderboard row IS this data), so one member
 * can see another's. Match history, who they played and when, and achievement progress are private
 * and are deliberately NOT fetched here.
 *
 * `status` is `loading` only while the first answer is in flight. Either half can come back `null`
 * (offline, 404, a member who has never played) and stays `null`: the sheet shows an honest empty
 * state for it and never a made-up number.
 */
export interface MemberGameRecord {
  status: "loading" | "ready";
  stats: PlayerStats | null;
  progression: MiniclipXPProgression | null;
}

const LOADING: MemberGameRecord = { status: "loading", stats: null, progression: null };

export function useMemberGameRecord(playerId: string | null): MemberGameRecord {
  const [record, setRecord] = useState<{ forId: string | null; value: MemberGameRecord }>({ forId: null, value: LOADING });

  useEffect(() => {
    if (!playerId) return undefined;
    let cancelled = false;
    const id = encodeURIComponent(playerId);

    void (async () => {
      const [statsRes, progressionRes] = await Promise.all([
        apiJson<{ stats: PlayerStats }>(`/api/profile/${id}/stats`),
        apiJson<{ progression: MiniclipXPProgression }>(`/api/profile/${id}/progression`),
      ]);
      if (cancelled) return;
      setRecord({
        forId: playerId,
        value: { status: "ready", stats: statsRes?.stats ?? null, progression: progressionRes?.progression ?? null },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  // A different member's numbers must never flash under this member's name while their own load.
  return record.forId === playerId && playerId !== null ? record.value : LOADING;
}
