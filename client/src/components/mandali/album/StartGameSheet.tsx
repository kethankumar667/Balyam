import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { GameKind } from "@shared/types.js";
import { useTranslation } from "../../../hooks/useTranslation";
import { AlbumButton } from "./AlbumButton";
import { AlbumSheet } from "./AlbumSheet";
import { GAMES } from "./games";

const FIELD =
  "album-focus min-h-[48px] w-full rounded-xl border border-album-line bg-album-field px-3.5 text-[15px] text-album-ink placeholder:text-album-ink3 focus-visible:border-album-foil";

export interface StartGameSheetProps {
  open: boolean;
  onClose: () => void;
  /** Resolves with the answer; the sheet stays open and shows the error when it is not a success. */
  onStart: (game: GameKind) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Pick the game to play with the group. Starting opens the normal create-room flow for it (stakes,
 * seats and bots are decided there, like any room); once the room exists it is shared into the group
 * from the room's own "Share to Mandali" button, and friends join from the card it posts.
 */
export function StartGameSheet({ open, onClose, onStart }: StartGameSheetProps) {
  const { t } = useTranslation();
  const gameId = useId();
  const [game, setGame] = useState<GameKind>("ludo");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref, not state: two quick taps in the same tick must not start two rooms.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await onStart(game);
      if (result.success) onClose();
      else setError(result.error || t("mandali.start.failed"));
    } catch {
      setError(t("mandali.start.failed"));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <AlbumSheet
      open={open}
      onClose={onClose}
      title={t("mandali.start.title")}
      description={t("mandali.start.hint")}
      footer={
        <AlbumButton type="submit" form="mandali-start-game" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? t("mandali.start.starting") : t("mandali.start.submit")}
        </AlbumButton>
      }
    >
      <form id="mandali-start-game" onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={gameId} className="mb-1.5 block text-sm font-semibold text-album-ink2">
            {t("mandali.start.game")}
          </label>
          <select id={gameId} value={game} onChange={(event) => setGame(event.target.value as GameKind)} className={FIELD}>
            {GAMES.map((g) => (
              <option key={g.kind} value={g.kind}>
                {g.name} ({g.min === g.max ? g.min : `${g.min}–${g.max}`})
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="m-0 rounded-xl bg-album-danger/10 px-3 py-2 text-sm text-album-danger">
            {error}
          </p>
        )}
      </form>
    </AlbumSheet>
  );
}
