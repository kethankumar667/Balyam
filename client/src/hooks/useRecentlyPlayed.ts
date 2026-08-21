import { useSyncExternalStore } from "react";
import { RecentlyPlayedManager, type RecentlyPlayedItem } from "../services/RecentlyPlayedManager";
import type { BhalyamGameSlug } from "../components/bhalyam/data";

export function useRecentlyPlayed(): {
  recentItems: RecentlyPlayedItem[];
  recordRecentlyPlayed: (slug: BhalyamGameSlug) => void;
  clearRecentlyPlayed: () => void;
} {
  const recentItems = useSyncExternalStore(
    RecentlyPlayedManager.subscribe.bind(RecentlyPlayedManager),
    () => RecentlyPlayedManager.getRecentlyPlayed(),
    () => []
  );

  return {
    recentItems,
    recordRecentlyPlayed: RecentlyPlayedManager.recordRecentlyPlayed.bind(RecentlyPlayedManager),
    clearRecentlyPlayed: RecentlyPlayedManager.clearRecentlyPlayed.bind(RecentlyPlayedManager),
  };
}
