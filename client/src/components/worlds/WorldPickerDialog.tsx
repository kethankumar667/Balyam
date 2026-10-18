import { useRef } from "react";
import { Check, Lock, X } from "lucide-react";
import type { GameKind } from "@shared/types";
import type { WorldId } from "@shared/worlds";
import { artWorldsFor } from "../../lib/worlds/worldArt";
import { WORLD_META, requirementFor } from "../../lib/worlds/worldMeta";
import Modal from "../Modal";
import { WorldSwatch } from "./WorldSwatch";

export interface WorldPickerDialogProps {
  open: boolean;
  onClose: () => void;
  game: GameKind;
  /** The world the table is in now. */
  current: WorldId;
  /** The worlds the host may choose: the ones earned, or all for an account that opens everything. */
  unlocked: readonly WorldId[];
  /** Everything is open because of the account, not because it was earned. */
  isAllOpen: boolean;
  onChoose: (world: WorldId) => void;
  /** Why the server refused the last choice, if it did. */
  error: string | null;
}

/**
 * Where the host chooses the table's world. Every player at the table will see it, which the dialog says first.
 * A world that has not been earned is listed with what it asks for, and cannot be picked.
 */
export function WorldPickerDialog({ open, onClose, game, current, unlocked, isAllOpen, onChoose, error }: WorldPickerDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const worlds = artWorldsFor(game);
  return (
    <Modal
      open={open}
      onClose={onClose}
      initialFocusRef={closeRef}
      ariaLabelledBy="world-picker-title"
      mobileSheet
      panelClassName="w-full max-w-md rounded-t-3xl md:rounded-3xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="world-picker-title" className="text-xl font-black text-[#2B3550] dark:text-slate-100">
              Choose the table&apos;s world
            </h2>
            <p className="mt-0.5 text-sm text-stone-600 dark:text-slate-300">Everyone at the table will see it.</p>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isAllOpen && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Every world is open on this account so it can be tested and reviewed. Nothing here is saved as earned.</p>}

        <div role="radiogroup" aria-label="World" className="max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
          {worlds.map((id) => {
            const isOpen = unlocked.includes(id);
            const isChosen = current === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isChosen}
                aria-disabled={!isOpen}
                onClick={() => {
                  if (isOpen) onChoose(id);
                }}
                className={`flex min-h-[64px] w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors aria-disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                  isChosen ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-stone-200 bg-stone-50/80 hover:bg-stone-100 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                }`}
              >
                <WorldSwatch world={id} isDimmed={!isOpen} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[#2B3550] dark:text-slate-100">{WORLD_META[id].name}</span>
                  <span className="block text-xs leading-snug text-stone-600 dark:text-slate-300">{WORLD_META[id].blurb}</span>
                  {!isOpen && <span className="mt-0.5 block text-xs font-semibold leading-snug text-amber-800 dark:text-amber-300">{requirementFor(game, id)}</span>}
                </span>
                {isChosen && <Check aria-hidden className="h-5 w-5 flex-shrink-0 text-amber-600" />}
                {!isOpen && <Lock aria-hidden className="h-4 w-4 flex-shrink-0 text-stone-500 dark:text-slate-400" />}
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
