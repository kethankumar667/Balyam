import { Link } from "react-router-dom";
import { DATA_INVENTORY, THIRD_PARTIES } from "../lib/privacy/dataInventory";
import {
  GRIEVANCE_ACK_DAYS,
  GRIEVANCE_RESOLVE_DAYS,
  PRIVACY_CONTACT_EMAIL,
} from "../lib/privacy/contact";
import { ArrowLeftIcon } from "../components/auth/authIcons";

/** Bump when the substance changes, not the wording. */
const LAST_UPDATED = "14 August 2026";

/**
 * The privacy notice — DPDP Sections 5, 9, 11, 12 and 13.
 *
 * The data and recipient tables are rendered FROM the inventory rather than
 * retyped beside it. A policy that is prose about data is a policy that goes
 * stale the first time a feature stores something new; this one cannot
 * describe a world the code is not in, because it is reading the same list
 * the export and the erase button read.
 *
 * Written in plain language on purpose. The Act asks for it, and a notice
 * nobody finishes is not informed consent however complete it is.
 */
export default function PrivacyPolicyPage() {
  const personal = DATA_INVENTORY.filter((e) => e.isPersonalData);
  const rest = DATA_INVENTORY.filter((e) => !e.isPersonalData);

  return (
    <div className="auth-shell bhalyam-home bhalyam-font bhalyam-paper min-h-screen flex flex-col">
      <header className="w-full px-4 sm:px-6 pt-4 sm:pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 rounded-full
                     text-[14px] font-bold text-[var(--auth-ink-soft)]
                     hover:text-[var(--auth-ink)] hover:bg-[var(--auth-rule)]/45
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                     transition-colors duration-200"
        >
          <ArrowLeftIcon className="w-[18px] h-[18px]" />
          Back to games
        </Link>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 pb-14">
        {/* 65–75ch measure — this is a page to be read, not scanned. */}
        <article className="mx-auto w-full max-w-[68ch] space-y-8">
          <div className="pt-2">
            <h1
              className="bhalyam-display text-[var(--auth-ink)] leading-tight"
              style={{ fontSize: "clamp(1.9rem, 5.5vw, 2.6rem)" }}
            >
              Privacy at BHALYAM
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--auth-ink-soft)]">
              The short version: everything stays on your device, there are no accounts yet, we
              sell nothing and track nothing. The long version is below, written to India&apos;s
              Digital Personal Data Protection Act, 2023.
            </p>
            <p className="mt-2 text-[12.5px] text-[var(--auth-ink-mute)]">
              Last updated {LAST_UPDATED}.
            </p>
          </div>

          <Section title="What we store, and why">
            <p>
              BHALYAM has no user accounts and no database. Everything listed here lives in your
              browser&apos;s local storage on the device you are reading this on, and never
              leaves it except where the next section says otherwise.
            </p>
            <h3 className="mt-4 text-[11px] uppercase tracking-widest font-bold text-[var(--auth-ink-soft)]">
              Personal data
            </h3>
            <DataList entries={personal} />
            <h3 className="mt-5 text-[11px] uppercase tracking-widest font-bold text-[var(--auth-ink-soft)]">
              Settings and progress
            </h3>
            <DataList entries={rest} />
          </Section>

          <Section title="Who else receives it">
            <p>
              Section 11 of the Act gives you the right to know who your data is shared with, so
              here they are by name. Money changing hands is not the test — an IP address
              reaching someone else&apos;s server is a transfer either way.
            </p>
            <ul className="mt-3 space-y-3">
              {THIRD_PARTIES.map((p) => (
                <li key={p.name}>
                  <p className="font-bold text-[var(--auth-ink)] text-[14px]">{p.name}</p>
                  <p className="text-[13.5px] leading-relaxed text-[var(--auth-ink-soft)]">
                    {p.receives} {p.when}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Your rights, and where to use them">
            <p>
              All of these live in one place: open <strong>Profile → Your data</strong>, or go
              straight to <PolicyLink to="/profile">your profile</PolicyLink>.
            </p>
            <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed">
              <Right label="See what's held (Section 11)">
                A full list of what is on this device, plus the recipients above.
              </Right>
              <Right label="Take a copy (Section 11)">
                &quot;Download my data&quot; gives you everything as a JSON file.
              </Right>
              <Right label="Correct it (Section 12)">
                Your display name and avatar are editable on the profile page. Nothing else we
                store is a fact about you that could be wrong.
              </Right>
              <Right label="Erase it (Section 12)">
                &quot;Erase my data&quot; clears the lot, including anything a newer feature
                stored that this notice has not caught up with.
              </Right>
              <Right label="Withdraw consent (Section 6(4))">
                Switch to essential-only at any time, in the same panel. It takes one tap, the
                same as granting it did, and the optional data is deleted rather than merely
                stopped.
              </Right>
            </ul>
            <p className="mt-3">
              One limit worth stating plainly: while you are sitting in a room, the server holds
              your name and seat in memory so the table keeps working. Leave the room and it is
              gone — rooms are never written to disk, and a server restart erases every one.
            </p>
          </Section>

          <Section title="Children and guardianship (Section 9)">
            <p>
              BHALYAM is a family game lounge, so children will play it. Today the app collects
              no contact details, has no accounts, shows no advertising and sends nothing to a
              server that outlives the room — which is the safest arrangement we can offer while
              verifiable guardian consent is not yet built.
            </p>
            <p className="mt-2">
              Before accounts arrive we will add age assurance and a verifiable guardian consent
              flow, because an account changes what is collected. Until then, a parent or
              guardian who wants everything removed from a device can do it themselves in
              seconds with &quot;Erase my data&quot;.
            </p>
          </Section>

          <Section title="Questions and complaints (Section 13)">
            {PRIVACY_CONTACT_EMAIL ? (
              <p>
                Write to{" "}
                <a
                  href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=BHALYAM%20privacy%20request`}
                  className="font-bold text-[var(--auth-accent)] underline decoration-[#D9BE7A]
                             underline-offset-4 rounded-sm
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
                >
                  {PRIVACY_CONTACT_EMAIL}
                </a>
                . We acknowledge within {GRIEVANCE_ACK_DAYS} days and aim to resolve within{" "}
                {GRIEVANCE_RESOLVE_DAYS}. If you are not satisfied, you may complain to the Data
                Protection Board of India.
              </p>
            ) : (
              /* Saying "not yet" beats printing an address nobody reads. */
              <p>
                A dedicated privacy contact is not published yet. Because nothing is stored
                anywhere but your own device, the controls in{" "}
                <PolicyLink to="/profile">your profile</PolicyLink> give you complete access and
                erasure without needing to ask anyone. You may also complain to the Data
                Protection Board of India.
              </p>
            )}
          </Section>

          <Section title="When this changes">
            <p>
              If we start collecting something new, sharing it with someone new, or using it for
              a new purpose, this notice changes and the consent prompt returns so the choice is
              made against what is actually true — not against what was true when you first
              opened the app.
            </p>
          </Section>
        </article>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="bhalyam-display text-[var(--auth-ink)] text-[22px] leading-tight">{title}</h2>
      <div className="text-[14px] leading-relaxed text-[var(--auth-ink-soft)]">{children}</div>
    </section>
  );
}

function DataList({ entries }: { entries: readonly (typeof DATA_INVENTORY)[number][] }) {
  return (
    <ul className="mt-2 space-y-2">
      {entries.map((e) => (
        <li key={e.key} className="text-[13.5px] leading-relaxed">
          <span className="font-bold text-[var(--auth-ink)]">{e.label}</span>
          {e.holdsOthersData ? (
            <span className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-[var(--auth-bad-bg)] text-[var(--auth-bad-ink)]">
              includes other players&apos; names
            </span>
          ) : null}
          <span className="block text-[var(--auth-ink-soft)]">{e.description}</span>
        </li>
      ))}
    </ul>
  );
}

function Right({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li>
      <span className="font-bold text-[var(--auth-ink)]">{label}.</span>{" "}
      <span className="text-[var(--auth-ink-soft)]">{children}</span>
    </li>
  );
}

function PolicyLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="font-bold text-[var(--auth-accent)] underline decoration-[#D9BE7A]
                 underline-offset-4 rounded-sm
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70"
    >
      {children}
    </Link>
  );
}
