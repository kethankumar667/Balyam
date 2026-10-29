import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, X } from "lucide-react";
import { PLAY_TOGETHER_GAMES, playTogetherHandOff, type PlayTogetherSlug } from "./playTogether";

const TRIGGER =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-500 bg-gradient-to-r from-amber-500 to-amber-400 px-4 text-xs font-black text-zinc-950 transition hover:from-amber-400 hover:to-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";
const CHOICE =
  "flex min-h-[52px] w-full flex-col items-start justify-center rounded-xl border border-[var(--auth-field-edge)] bg-[var(--auth-field)] px-3.5 py-2 text-left transition hover:bg-[var(--auth-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

/**
 * Starts a room for one friend who has joined but not yet played. It hands the chosen game and the
 * friend's name to the create-room sheet (the same hand-off a Mandali's "Start a game" uses); the room's
 * share card then names the friend. A match only counts for the bonus if that friend really joins it.
 */
export function PlayTogetherButton({ friendName, label, className = "mt-3" }: { friendName: string; label?: string; className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const listId = useId();

  function start(slug: PlayTogetherSlug) {
    navigate("/", { state: playTogetherHandOff(slug, friendName) });
  }

  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls={listId} aria-label={`Play with ${friendName}`} className={TRIGGER}>
        <Gamepad2 size={16} aria-hidden="true" /> {label ?? `Play with ${friendName}`}
      </button>
      {open && (
        <div id={listId} role="group" aria-label={`Pick a game to play with ${friendName}`} className="mt-2 space-y-2 rounded-2xl border border-[var(--auth-card-edge)] bg-[var(--auth-card)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-[var(--auth-ink)]">Pick a game</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close game list" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--auth-ink-soft)] hover:text-[var(--auth-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {PLAY_TOGETHER_GAMES.map(game => (
            <button key={game.slug} type="button" onClick={() => start(game.slug)} className={CHOICE}>
              <span className="text-sm font-bold text-[var(--auth-ink)]">{game.label}</span>
              <span className="text-[11px] text-[var(--auth-ink-soft)]">{game.hint}</span>
            </button>
          ))}
          <p className="text-[11px] leading-relaxed text-[var(--auth-ink-soft)]">
            We will name {friendName} in the share message. A match against a bot does not count for the bonus, so wait for {friendName} to join.
          </p>
        </div>
      )}
    </div>
  );
}
