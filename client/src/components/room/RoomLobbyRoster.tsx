import type { BotDifficulty, GameKind, Player } from "@shared/types";
import ParticipantPanel from "./ParticipantPanel";
import JoinFeedbackBanner from "./JoinFeedbackBanner";
import { useJoinAnimationTracker, type JoinEvent } from "../../hooks/useJoinAnimationTracker";

export interface RoomLobbyRosterProps {
  roomCode?: string;
  players: Player[];
  maxPlayers: number;
  selfId: string | null;
  isHost: boolean;
  game: GameKind;
  /** `phase === "lobby"` — join feedback only makes sense pre-match. */
  enabled: boolean;
  /** True while a higher-priority connection/recovery banner is visible. */
  hasCriticalBannerAbove?: boolean;
  onAddBot: (name?: string, difficulty?: BotDifficulty) => Promise<void> | void;
  onRemoveBot?: (botId: string) => void;
  onRemoveLocalPlayer?: (localId: string) => void;
  onRenameBot?: (botId: string, newName: string) => void;
  /** Fed every genuinely-new join (uncapped) so callers can drive
   *  join-adjacent presentation (e.g. the lobby coin-particle flight)
   *  without running a second, independent roster diff. */
  onLobbyJoin?: (joined: JoinEvent[]) => void;
}

/**
 * Single integration boundary between the authoritative roster and every
 * join-feedback surface: the participant grid (row highlight), the floating
 * join banner, and — via `onLobbyJoin` — any other join-driven presentation.
 * `Room.tsx` must not run its own player-array diff alongside this.
 */
export default function RoomLobbyRoster({
  roomCode,
  players,
  maxPlayers,
  selfId,
  isHost,
  game,
  enabled,
  hasCriticalBannerAbove = false,
  onAddBot,
  onRemoveBot,
  onRemoveLocalPlayer,
  onRenameBot,
  onLobbyJoin,
}: RoomLobbyRosterProps) {
  const { recentJoins, newPlayerIds, dismissJoin } = useJoinAnimationTracker(players, {
    roomCode,
    enabled,
    onJoin: onLobbyJoin,
  });

  return (
    <>
      <ParticipantPanel
        players={players}
        maxPlayers={maxPlayers}
        selfId={selfId}
        isHost={isHost}
        game={game}
        newPlayerIds={newPlayerIds}
        onAddBot={onAddBot}
        onRemoveBot={onRemoveBot}
        onRemoveLocalPlayer={onRemoveLocalPlayer}
        onRenameBot={onRenameBot}
      />

      {enabled && (
        <JoinFeedbackBanner
          joins={recentJoins}
          onDismiss={dismissJoin}
          hasCriticalBannerAbove={hasCriticalBannerAbove}
        />
      )}
    </>
  );
}
