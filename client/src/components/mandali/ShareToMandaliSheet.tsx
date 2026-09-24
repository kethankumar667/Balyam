/**
 * BHALYAM Mandali — Share a room to a Mandali
 *
 * Opened from the room lobby. Lists the Mandalis you belong to; pick the one
 * you want to play with and the room appears in that group's chat as a card
 * with a Join button.
 *
 *  - One Mandali → it is preselected, so sharing is a single tap.
 *  - Several → you choose which group. After sharing you can send the same
 *    room to another group without reopening anything.
 *  - None → an honest empty state with a way to find one.
 *
 * Built on the shared `Modal` (focus trap, Escape, bottom sheet on phones).
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Users, Check, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import Modal from "../Modal";
import { useMandaliStore } from "../../store/mandaliStore";

export interface ShareToMandaliSheetProps {
  open: boolean;
  onClose: () => void;
  roomCode: string;
  gameName: string;
}

export default function ShareToMandaliSheet({ open, onClose, roomCode, gameName }: ShareToMandaliSheetProps) {
  const myMandalis = useMandaliStore((s) => s.myMandalis);
  const fetchMyMandalis = useMandaliStore((s) => s.fetchMyMandalis);
  const shareRoomToMandali = useMandaliStore((s) => s.shareRoomToMandali);

  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [sharedTo, setSharedTo] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSharedTo([]);
    setError(null);
    setSelectedId(null);
    setLoaded(false);
    void fetchMyMandalis().finally(() => setLoaded(true));
  }, [open, fetchMyMandalis]);

  // With exactly one Mandali there is nothing to choose — have it ready.
  useEffect(() => {
    if (open && loaded && myMandalis.length === 1 && selectedId === null) setSelectedId(myMandalis[0].id);
  }, [open, loaded, myMandalis, selectedId]);

  const selected = useMemo(() => myMandalis.find((m) => m.id === selectedId) ?? null, [myMandalis, selectedId]);
  const alreadyShared = selected ? sharedTo.includes(selected.id) : false;

  const handleShare = async () => {
    if (!selected || sharing) return;
    setSharing(true);
    setError(null);
    const result = await shareRoomToMandali(selected.id, roomCode);
    setSharing(false);
    if (result.success) {
      setSharedTo((prev) => [...prev, selected.id]);
      return;
    }
    setError(result.error ?? "Could not share this room. Please try again.");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      mobileSheet
      ariaLabelledBy="share-mandali-title"
      panelClassName="w-full max-w-md rounded-t-3xl md:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 id="share-mandali-title" className="text-base font-black text-slate-900 dark:text-white">
            Play with your Mandali
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Post {gameName} room <span className="font-mono font-bold tracking-widest">{roomCode}</span> in a group's
            chat with a Join button.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4">
        {!loaded ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding your Mandalis…
          </div>
        ) : myMandalis.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-9 h-9 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">You are not in a Mandali yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Join or start one to invite its members to your room.
            </p>
            <Link
              to="/mandali"
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-sm"
            >
              Find a Mandali
            </Link>
          </div>
        ) : (
          <>
            <fieldset>
              <legend className="sr-only">Choose a Mandali</legend>
              <div className="space-y-2">
                {myMandalis.map((m) => {
                  const isSelected = m.id === selectedId;
                  const done = sharedTo.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 min-h-[56px] px-3.5 py-2.5 rounded-2xl border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-amber-500 ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500"
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mandali"
                        value={m.id}
                        checked={isSelected}
                        onChange={() => {
                          setSelectedId(m.id);
                          setError(null);
                        }}
                        className="sr-only"
                      />
                      <span className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">{m.name}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          @{m.handle} · {m.memberCount} members
                        </span>
                      </span>
                      {done ? (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Shared
                        </span>
                      ) : (
                        isSelected && <Check className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </p>
            )}

            {sharedTo.length > 0 && selected && alreadyShared && (
              <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Posted in {selected.name}.{" "}
                <a
                  href={`/mandali/${selected.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Open the chat in a new tab
                </a>
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-sm transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                {sharedTo.length > 0 ? "Done" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={!selected || sharing || alreadyShared}
                className="min-h-[48px] rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                {sharing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sharing…
                  </>
                ) : alreadyShared ? (
                  "Shared"
                ) : (
                  "Share room"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
