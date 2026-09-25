import { useEffect, useId, useState, type FormEvent } from "react";
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
  onStart: (game: GameKind, title: string, seats: number) => void;
}

/**
 * Start a game for the group. One form for both layouts.
 *
 * The seat count follows the game: a two-player game has no choice to make, so
 * the field says so instead of offering seats nobody can use.
 */
export function StartGameSheet({ open, onClose, onStart }: StartGameSheetProps) {
  const { t } = useTranslation();
  const ids = { name: useId(), game: useId(), seats: useId() };
  const [game, setGame] = useState<GameKind>("ludo");
  const [name, setName] = useState("");
  const [seats, setSeats] = useState(4);

  const option = GAMES.find((g) => g.kind === game) ?? GAMES[0];
  const seatsAreFixed = option.min === option.max;

  useEffect(() => {
    setSeats((current) => Math.min(option.max, Math.max(option.min, seatsAreFixed ? option.max : current)));
  }, [option.min, option.max, seatsAreFixed]);

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onStart(game, name.trim() || t("mandali.start.defaultName", { game: option.name }), seats);
    onClose();
  };

  return (
    <AlbumSheet
      open={open}
      onClose={onClose}
      title={t("mandali.start.title")}
      footer={
        <AlbumButton type="submit" form="mandali-start-game" variant="primary" size="lg" className="w-full">
          {t("mandali.start.submit")}
        </AlbumButton>
      }
    >
      <form id="mandali-start-game" onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={ids.name} className="mb-1.5 block text-sm font-semibold text-album-ink2">
            {t("mandali.start.name")}
          </label>
          <input
            id={ids.name}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder={t("mandali.start.namePlaceholder")}
            className={FIELD}
          />
        </div>

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
      </form>
    </AlbumSheet>
  );
}
