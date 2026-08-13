import { useState } from "react";
import {
  DATA_INVENTORY,
  THIRD_PARTIES,
  buildDataExport,
  eraseLocalData,
  exportFilename,
} from "../../lib/privacy/dataInventory";
import { Link } from "react-router-dom";
import { readConsent, withdrawConsent } from "../../lib/privacy/consent";
import {
  GRIEVANCE_ACK_DAYS,
  GRIEVANCE_RESOLVE_DAYS,
  PRIVACY_CONTACT_EMAIL,
} from "../../lib/privacy/contact";

/**
 * The player's own data controls — DPDP Sections 11, 12 and 13 in one place.
 *
 * Deliberately not three scattered features. Someone who wants to know what
 * is held, take a copy of it, or have it erased is in one frame of mind, and
 * making them hunt through settings for each is the kind of friction the Act
 * exists to remove. Section 6(4) says withdrawing must be as easy as giving;
 * the same principle applies to the rest.
 *
 * Everything here operates on this device. Account data is a later phase —
 * the panel says so rather than implying a completeness it does not have.
 */
export default function YourDataPanel() {
  const [confirming, setConfirming] = useState(false);
  const [erased, setErased] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [consent, setConsent] = useState(() => readConsent());

  const personal = DATA_INVENTORY.filter((e) => e.isPersonalData);

  function handleExport() {
    const payload = buildDataExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoking immediately can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function handleErase() {
    const res = eraseLocalData();
    setErased(res.removed.length + res.removedUndeclared.length);
    setConfirming(false);
  }

  return (
    <div className="space-y-3">
      <header>
        <h3 className="text-sm uppercase tracking-wider text-[#7A6652] dark:text-slate-400 font-bold">
          Your data
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#6D5540] dark:text-slate-300">
          {/* "can keep", not "keeps": this is the notice, describing what the
              app is capable of storing. What is actually on the device right
              now is what the export below returns, and the two are different
              numbers for anyone who has not played every game. */}
          BHALYAM can keep up to {personal.length} pieces of personal data on this device, and no
          account is required to play. Rooms live in the server&apos;s memory only while they are
          open.
        </p>
      </header>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="inline-flex items-center min-h-[44px] text-[12.5px] font-bold
                   text-[#8A5A11] dark:text-amber-300 underline
                   decoration-[#D9BE7A] underline-offset-4 rounded-sm
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
      >
        {expanded ? "Hide what's stored" : "See exactly what's stored"}
      </button>

      {expanded ? (
        <div className="space-y-3 rounded-lg border border-[#E6D4B7] dark:border-slate-700 p-3">
          <ul className="space-y-2">
            {DATA_INVENTORY.map((e) => (
              <li key={e.key} className="text-[12px] leading-relaxed">
                <span className="font-bold text-[#3F2A1D] dark:text-slate-100">{e.label}</span>
                {e.holdsOthersData ? (
                  <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#FBE9E6] text-[#8E2B22] dark:bg-[#3A1D18] dark:text-[#F0B4AA]">
                    includes others&apos; names
                  </span>
                ) : null}
                <span className="block text-[#6D5540] dark:text-slate-400">{e.description}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t border-[#E6D4B7] dark:border-slate-700">
            <p className="text-[11px] uppercase tracking-widest font-bold text-[#7A6652] dark:text-slate-400">
              Who else receives it
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {THIRD_PARTIES.map((p) => (
                <li key={p.name} className="text-[12px] leading-relaxed">
                  <span className="font-bold text-[#3F2A1D] dark:text-slate-100">{p.name}</span>
                  <span className="block text-[#6D5540] dark:text-slate-400">
                    {p.receives} {p.when}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="min-h-[44px] px-4 rounded-lg text-[13px] font-bold cursor-pointer
                     bg-[#FCF8EF] dark:bg-slate-800 border border-[#E6D4B7] dark:border-slate-600
                     text-[#3F2A1D] dark:text-slate-100 hover:bg-[#F6E9CE] dark:hover:bg-slate-700
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                     transition-colors duration-200"
        >
          Download my data
        </button>

        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleErase}
              className="min-h-[44px] px-4 rounded-lg text-[13px] font-bold cursor-pointer
                         bg-[#C6342B] text-white border border-[#A3231B]
                         hover:bg-[#A3231B] focus:outline-none focus-visible:ring-2
                         focus-visible:ring-[#C6342B]/70 transition-colors duration-200"
            >
              Yes, erase everything
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-[44px] px-4 rounded-lg text-[13px] font-bold cursor-pointer
                         text-[#6D5540] dark:text-slate-300 hover:underline
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirming(true);
              setErased(null);
            }}
            className="min-h-[44px] px-4 rounded-lg text-[13px] font-bold cursor-pointer
                       bg-transparent border border-[#C6342B]/60 text-[#A3231B] dark:text-[#F0B4AA]
                       hover:bg-[#FBE9E6] dark:hover:bg-[#3A1D18]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6342B]/70
                       transition-colors duration-200"
          >
            Erase my data
          </button>
        )}
      </div>

      {confirming ? (
        <p role="alert" className="text-[12px] leading-relaxed text-[#8E2B22] dark:text-[#F0B4AA]">
          This clears your name, scores, settings and saved seats from this device, and cannot be
          undone. If you are in a room right now, leave it first — the server holds your seat until
          you do.
        </p>
      ) : null}

      {erased !== null ? (
        <p role="status" className="text-[12px] leading-relaxed text-[#2E5B2B] dark:text-[#B7DDAF]">
          Erased {erased} {erased === 1 ? "item" : "items"} from this device. Anything you do next
          starts a fresh profile.
        </p>
      ) : null}

      {/* Withdrawal, sitting with the other rights. Section 6(4): taking it
          back must cost no more than giving it did. */}
      {consent?.choice === "granted" ? (
        <div className="pt-2 border-t border-[#E6D4B7] dark:border-slate-700">
          <p className="text-[12px] leading-relaxed text-[#6D5540] dark:text-slate-300">
            You allowed BHALYAM to remember settings and scores on this device.
          </p>
          <button
            type="button"
            onClick={() => setConsent(withdrawConsent())}
            className="mt-2 min-h-[44px] px-4 rounded-lg text-[13px] font-bold cursor-pointer
                       bg-[#FCF8EF] dark:bg-slate-800 border border-[#E6D4B7] dark:border-slate-600
                       text-[#3F2A1D] dark:text-slate-100 hover:bg-[#F6E9CE] dark:hover:bg-slate-700
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       transition-colors duration-200"
          >
            Switch to essential only
          </button>
        </div>
      ) : consent ? (
        <p className="pt-2 border-t border-[#E6D4B7] dark:border-slate-700 text-[12px] leading-relaxed text-[#6D5540] dark:text-slate-300">
          You chose essential-only, so settings and scores are not kept between visits.
        </p>
      ) : null}

      <div className="pt-2 border-t border-[#E6D4B7] dark:border-slate-700">
        <p className="text-[12px] leading-relaxed text-[#6D5540] dark:text-slate-300">
          <Link
            to="/privacy"
            className="inline-flex items-center min-h-[44px] font-bold
                       text-[#8A5A11] dark:text-amber-300 underline
                       decoration-[#D9BE7A] underline-offset-4 rounded-sm
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
          >
            Read the full privacy notice
          </Link>
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-[#6D5540] dark:text-slate-300">
          {PRIVACY_CONTACT_EMAIL ? (
            <>
              Questions or a complaint about your data?{" "}
              <a
                href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=BHALYAM%20privacy%20request`}
                className="font-bold text-[#8A5A11] dark:text-amber-300 underline
                           decoration-[#D9BE7A] underline-offset-4 rounded-sm
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
              >
                {PRIVACY_CONTACT_EMAIL}
              </a>
              . We reply within {GRIEVANCE_ACK_DAYS} days and aim to resolve within{" "}
              {GRIEVANCE_RESOLVE_DAYS}.
            </>
          ) : (
            /* Honest rather than decorative — see lib/privacy/contact.ts. A
               dead address here would let someone believe they had filed a
               request that nobody will ever read. */
            <>
              A privacy contact address has not been set up yet. Until it is, the controls above
              are the way to see and erase your data, and nothing is stored anywhere but this
              device.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
