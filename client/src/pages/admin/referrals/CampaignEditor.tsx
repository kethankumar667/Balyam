import { useEffect, useId, useState, type FormEvent } from "react";
import {
  REFERRAL_ADMIN_LIMITS,
  REFERRAL_ADMIN_NOTE_MAX,
  REFERRAL_CAMPAIGN_FIELDS,
  type ReferralAdminCampaign,
  type ReferralCampaignPatch,
} from "@shared/referrals";
import { checkCampaignForm, formFromCampaign, type CampaignForm } from "./referralAdminModel";
import { consoleErrorMessage } from "./referralAdminApi";
import { BUTTON, FIELD, PRIMARY } from "./consoleStyles";

interface CampaignEditorProps {
  campaign: ReferralAdminCampaign;
  /** Saves the change. Rejects with a sentence the operator can read if the server refuses. */
  onSave: (changes: ReferralCampaignPatch, note: string) => Promise<void>;
}

/**
 * The campaign settings: what each side earns, how many friends are rewarded per window, and how long a new member
 * may add a code. Bounded to the same limits the database enforces, and nothing is sent without a written note: it
 * is the one line the next operator reads to learn why the numbers changed. "Stop the coin bonus" only fills in zeros;
 * it still needs a note and a save, like any other change.
 */
export function CampaignEditor({ campaign, onSave }: CampaignEditorProps) {
  const [form, setForm] = useState<CampaignForm>(() => formFromCampaign(campaign));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const noteId = useId();

  // A saved or refreshed campaign replaces what is in the form.
  useEffect(() => { setForm(formFromCampaign(campaign)); setNote(""); }, [campaign]);

  const check = checkCampaignForm(form, campaign);
  const noteReady = note.trim().length > 0;
  const canSave = !saving && check.ok && noteReady;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!check.ok || !noteReady || saving) return;
    setSaving(true);
    setProblem(null);
    setSaved(false);
    try {
      await onSave(check.changes, note.trim());
      setSaved(true);
    } catch (err) {
      setProblem(consoleErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const setField = (field: keyof CampaignForm, value: string) => { setForm(prev => ({ ...prev, [field]: value })); setSaved(false); };

  return (
    <section aria-labelledby="campaign-heading" className="rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-4">
      <h2 id="campaign-heading" className="text-sm font-black text-[var(--chrome-ink)]">Campaign settings</h2>
      <p className="mt-1 text-xs text-[var(--chrome-ink-soft)]">
        Bonuses already issued are never changed. A friend whose bonus has not been reserved yet gets the new amounts. Every change is recorded with who made it and why.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REFERRAL_CAMPAIGN_FIELDS.map(field => {
            const { min, max, label } = REFERRAL_ADMIN_LIMITS[field];
            return (
              <label key={field} className="flex flex-col">
                <span className="mb-1 flex-1 text-xs font-bold text-[var(--chrome-ink)]">{label}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  step={1}
                  value={form[field]}
                  onChange={event => setField(field, event.target.value)}
                  disabled={saving}
                  className={FIELD}
                />
                <span className="mt-0.5 block text-[11px] text-[var(--chrome-ink-soft)]">{min.toLocaleString("en-IN")} to {max.toLocaleString("en-IN")}</span>
              </label>
            );
          })}
        </div>

        <label className="block" htmlFor={noteId}>
          <span className="mb-1 block text-xs font-bold text-[var(--chrome-ink)]">Why are you changing this? (required)</span>
          <input id={noteId} value={note} onChange={event => { setNote(event.target.value); setSaved(false); }} maxLength={REFERRAL_ADMIN_NOTE_MAX} disabled={saving} placeholder="For example: launch-week boost, ends Sunday" className={FIELD} />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={!canSave} className={PRIMARY}>{saving ? "Saving…" : "Save changes"}</button>
          <button type="button" disabled={saving} onClick={() => { setField("inviterBonus", "0"); setField("inviteeBonus", "0"); }} className={BUTTON}>Stop the coin bonus</button>
          <button type="button" disabled={saving} onClick={() => { setForm(formFromCampaign(campaign)); setNote(""); setProblem(null); setSaved(false); }} className={BUTTON}>Reset</button>
        </div>

        <p role="status" aria-live="polite" className="min-h-[1rem] text-xs font-bold text-[var(--chrome-ink)]">
          {saved ? "Saved and recorded." : !check.ok && check.message ? <span className="text-rose-600 dark:text-rose-400">{check.message}</span> : ""}
        </p>
        {problem && <p role="alert" className="text-xs font-bold text-rose-600 dark:text-rose-400">Not saved: {problem}</p>}
      </form>
    </section>
  );
}
