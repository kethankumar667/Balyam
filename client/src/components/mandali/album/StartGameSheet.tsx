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
  /** Resolves with the server's answer; the sheet stays open and shows the error when it is not a success. */
  onStart: (game: GameKind, title: string, seats: number) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Start a game for the group. One form for both layouts.
 *
 * The seat count follows the game: a two-player game has no choice to make, so
 * the field says so instead of offering seats nobody can use.
 */
export function StartGameSheet({ open, onClose, onStart }: StartGameSheetProps) {
  const { t } = useTranslation();
  const ids = { game: useId(), seats: useId() };
  const [game, setGame] = useState<GameKind>("ludo");
  const [seats, setSeats] = useState(4);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A ref, not state: two quick taps in the same tick must not start two games.
  const inFlight = useRef(false);

  const option = GAMES.find((g) => g.kind === game) ?? GAMES[0];
  const seatsAreFixed = option.min === option.max;

  useEffect(() => {
    setSeats((current) => Math.min(option.max, Math.max(option.min, seatsAreFixed ? option.max : current)));
  }, [option.min, option.max, seatsAreFixed]);

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
      const result = await onStart(game, t("mandali.start.defaultName", { game: option.name }), seats);
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
      footer={
        <AlbumButton type="submit" form="mandali-start-game" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? t("mandali.start.starting") : t("mandali.start.submit")}
        </AlbumButton>
      }
    >
      <form id="mandali-start-game" onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={ids.game} className="mb-1.5 block text-sm font-semibold text-album-ink2">
            {t("mandali.start.game")}
          </label>
          <select id={ids.game} value={game} onChange={(event) => setGame(event.target.value as GameKind)} className={FIELD}>
            {GAMES.map((g) => (
              <option key={g.kind} value={g.kind}>
                {g.name} ({g.min === g.max ? g.min : `${g.min}–${g.max}`})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={ids.seats} className="mb-1.5 block text-sm font-semibold text-album-ink2">
            {t("mandali.start.seats")}
          </label>
          {seatsAreFixed ? (
            <p id={ids.seats} className="m-0 text-[15px] text-album-ink2">
              {t("mandali.start.seatsFixed", { count: option.max })}
            </p>
          ) : (
            <input
              id={ids.seats}
              type="number"
              inputMode="numeric"
              min={option.min}
              max={option.max}
              value={seats}
              onChange={(event) => setSeats(Math.min(option.max, Math.max(option.min, Number(event.target.value) || option.min)))}
              className={FIELD}
            />
          )}
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
