import { useRef, useState } from "react";
import { getGameModeConfig } from "@shared/profile/GameModes";
import type { DeviceBestEntry } from "@shared/profile/Scorecard";
import Modal from "../Modal";
import { importDeviceBests } from "../../features/myrecords/deviceRecords";
import { useScorecardStore } from "../../store/scorecardStore";
import { useSignOutGuardStore } from "../../store/signOutGuardStore";

const BUTTON =
  "w-full min-h-[44px] rounded-2xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60";

function describeBest({ game, modeId, score }: DeviceBestEntry): string {
  const config = getGameModeConfig(game);
  const mode = config.modes.find((candidate) => candidate.modeId === modeId);
  return `${config.displayName} · ${mode?.displayName ?? modeId}: ${score.toLocaleString()}`;
}

/**
 * Asked before a sign-out that would delete records the account does not have.
 *
 * Signing out clears the device so the next person on a shared phone starts clean. Anything that only ever
 * reached this device goes with it, so the player chooses: save it to the account first, let it go, or stay.
 * "Save" must fully succeed before the sign-out proceeds; if it cannot, the dialog stays open and says why.
 */
export default function SignOutGuardDialog() {
  const risk = useSignOutGuardStore((state) => state.risk);
  const answer = useSignOutGuardStore((state) => state.answer);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  const cancel = () => {
    setError(null);
    answer("cancel");
  };

  const letGo = () => {
    setError(null);
    answer("signout");
  };

  const saveThenSignOut = async () => {
    if (!risk) return;
    setIsBusy(true);
    setError(null);
    try {
      if (risk.pending > 0) {
        const { remaining } = await useScorecardStore.getState().flushPendingScores(risk.playerId);
        if (remaining > 0) throw new Error("Some scores could not be sent. Check your connection and try again.");
      }
      if (risk.deviceBests.length > 0) await importDeviceBests(risk.playerId, risk.deviceBests);
      answer("signout");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your records could not be saved. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal
      open={risk !== null}
      onClose={isBusy ? undefined : cancel}
      closeOnBackdropClick={false}
      mobileSheet
      initialFocusRef={saveRef}
      ariaLabelledBy="sign-out-guard-title"
      ariaDescribedBy="sign-out-guard-body"
      zIndex={70}
      panelClassName="bhalyam-font relative w-full md:max-w-md max-h-[92dvh] overflow-y-auto bg-bhalyam-cream-soft dark:bg-[#111622] text-bhalyam-wood-dark dark:text-slate-100 border-2 border-bhalyam-cream-edge/70 dark:border-slate-800 rounded-t-3xl md:rounded-3xl p-5 space-y-4"
      panelStyle={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
    >
      {risk && (
        <>
          <h2 id="sign-out-guard-title" className="text-lg font-bold leading-tight">
            Some of your records are only on this device
          </h2>

          <div id="sign-out-guard-body" className="space-y-3 text-sm">
            <p>Signing out clears this device, so anything that has not reached your account would be lost for good.</p>
            <ul className="space-y-1.5 rounded-2xl bg-black/5 p-3 dark:bg-white/5">
              {risk.pending > 0 && (
                <li>{risk.pending === 1 ? "1 score waiting" : `${risk.pending} scores waiting`} to reach your account</li>
              )}
              {risk.deviceBests.map((best) => (
                <li key={`${best.game}:${best.modeId}`}>{describeBest(best)}</li>
              ))}
            </ul>
            {risk.deviceBests.length > 0 && (
              <p className="text-xs opacity-80">
                Bests saved from this device appear in My Records and are private to you. They do not count on leaderboards.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <button
              ref={saveRef}
              type="button"
              disabled={isBusy}
              onClick={() => void saveThenSignOut()}
              className={`${BUTTON} bg-amber-400 text-[#3B2506] hover:bg-amber-300`}
            >
              {isBusy ? "Saving…" : "Save to my account, then sign out"}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={letGo}
              className={`${BUTTON} border border-red-500/50 text-red-700 hover:bg-red-500/10 dark:text-red-300`}
            >
              Sign out and delete them
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={cancel}
              className={`${BUTTON} border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10`}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
