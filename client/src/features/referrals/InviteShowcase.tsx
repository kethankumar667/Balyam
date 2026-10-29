import { Gift, X } from "lucide-react";
import CountUp from "../../components/CountUp";
import { AshthaKonaCoinIcon } from "../../components/economy/CoinAmount";
import type { InvitePromoOffer } from "../../store/invitePromoStore";
import { GuestTicket, MemberTicket } from "./InviteTicket";
import { promiseLine } from "./referralCopy";
import { useInvitePromoView } from "./useInvitePromoView";

/** Where each drifting coin starts across the photograph, how long it waits, and how big it is. */
const DRIFTING_COINS = [
  { left: "6%", delay: "0s", size: 20 },
  { left: "24%", delay: "2.2s", size: 14 },
  { left: "42%", delay: "4.1s", size: 22 },
  { left: "58%", delay: "1.1s", size: 16 },
  { left: "74%", delay: "3.2s", size: 20 },
  { left: "90%", delay: "5.3s", size: 14 },
] as const;

const GUEST_STEPS = ["Create a free account", "Share your invite code", "Your friend plays a match and you both earn coins"] as const;

function DriftingCoins() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[30px] hidden h-[230px] motion-safe:block xl:inset-y-0 xl:left-[36%] xl:right-[32%] xl:top-0 xl:h-auto">
      {DRIFTING_COINS.map((coin) => (
        <span key={coin.left} className="absolute bottom-0 opacity-0 motion-safe:animate-invite-coin" style={{ left: coin.left, animationDelay: coin.delay }}>
          <AshthaKonaCoinIcon size={coin.size} className="!text-amber-300 drop-shadow-[0_0_6px_rgba(244,196,48,0.85)]" />
        </span>
      ))}
    </div>
  );
}

/** The friends, glowing through the middle of the panel; dark on the sides so the words and the ticket stay readable. */
function Photograph() {
  return (
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[220px] sm:h-[260px] xl:inset-0 xl:h-auto">
      <picture>
        <source type="image/avif" srcSet="/gangoffriends.avif" />
        <source type="image/webp" srcSet="/gangoffriends.webp" />
        <img src="/gangoffriends.png" alt="" width={1536} height={1024} loading="lazy" decoding="async" className="h-full w-full object-cover object-[50%_35%] opacity-95" />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-[#2A0E08]/10 via-[#2A0E08]/55 to-[#2A0E08] xl:hidden" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#2A0E08_0%,rgba(42,14,8,0.94)_28%,rgba(42,14,8,0.25)_52%,rgba(42,14,8,0.5)_70%,#2A0E08_96%)] xl:block" />
    </div>
  );
}

function RewardChip({ label, amount }: { label: string; amount: number }) {
  return (
    <li className="min-w-0 rounded-2xl border border-amber-300/35 bg-[#2A0E08]/65 p-3 backdrop-blur-sm">
      <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">{label}</p>
      <p className="m-0 mt-1 flex items-center gap-2 text-2xl font-black tabular-nums text-[#FFE08A] sm:text-3xl">
        <AshthaKonaCoinIcon size={26} className="!text-amber-300" />
        <span>
          +<CountUp end={amount} />
        </span>
      </p>
    </li>
  );
}

function MemberRewards({ offer }: { offer: InvitePromoOffer }) {
  const { inviterBonus, inviteeBonus } = offer.campaign;
  return (
    <>
      <ul className="m-0 mt-5 grid max-w-md list-none grid-cols-2 gap-3 p-0">
        <RewardChip label="You get" amount={inviterBonus} />
        <RewardChip label="Your friend gets" amount={inviteeBonus} />
      </ul>
      <p className="m-0 mt-3 max-w-lg text-sm leading-relaxed text-[#F3DDB5]">{promiseLine(offer.campaign)}</p>
    </>
  );
}

/** A guest has no campaign to read, so the pitch is three plain steps and no coin figure. */
function GuestSteps() {
  return (
    <ol className="m-0 mt-5 grid max-w-xl list-none gap-2 p-0 sm:grid-cols-3">
      {GUEST_STEPS.map((text, index) => (
        <li key={text} className="flex items-start gap-2 rounded-2xl border border-amber-300/30 bg-[#2A0E08]/75 p-3 backdrop-blur-sm text-[13px] font-semibold leading-snug text-[#F3DDB5]">
          <span aria-hidden="true" className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F4C430] text-[11px] font-black text-[#3A1A0A]">
            {index + 1}
          </span>
          {text}
        </li>
      ))}
    </ol>
  );
}

/**
 * The home page's invitation, drawn to be noticed: a dark espresso-and-gold panel with the friends' photograph
 * glowing through it, coins drifting up (only when motion is allowed), and a tilted gold admission pass that holds
 * the member's code. The panel stays dark in both themes. It follows the same rules as every invitation surface
 * (`useInvitePromoView`): nothing while loading, on error or once dismissed; a guest sees a locked pass and no amount.
 */
export function InviteShowcase({ className }: { className?: string }) {
  const view = useInvitePromoView();
  if (view.kind === "hidden") return null;

  return (
    <div className={className}>
      <section
        aria-label="Invite your friends"
        data-placement="home"
        className="relative isolate overflow-hidden rounded-[26px] border border-amber-300/40 bg-gradient-to-br from-[#3A1209] via-[#2A0E08] to-[#1B0905] text-[#FFF3D6] shadow-[0_24px_48px_-24px_rgba(58,18,9,0.85)] sm:rounded-[34px]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-500/25 blur-3xl" />
        <Photograph />
        <DriftingCoins />
        <button
          type="button"
          onClick={view.dismiss}
          aria-label="Hide this invitation for now"
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-amber-100 backdrop-blur transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 motion-reduce:transition-none"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="relative grid gap-6 px-5 pb-6 pt-[176px] sm:px-8 sm:pb-8 sm:pt-[216px] xl:grid-cols-[minmax(0,1fr)_330px] xl:items-center xl:gap-10 xl:p-10">
          <div className="min-w-0">
            <p className="m-0 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-amber-200">
              <Gift size={14} aria-hidden="true" /> Invite and earn
            </p>
            <h2 className="m-0 mt-3 font-display text-[32px] leading-[1.05] text-[#FFF3D6] sm:text-5xl xl:text-[56px]">
              Bring your{" "}
              <span className="text-[#F4C430]">
                <span className="whitespace-nowrap">last-bench</span> gang.
              </span>
            </h2>
            <p className="m-0 mt-2 font-script text-2xl text-amber-200 sm:text-3xl">Every game tastes better with friends</p>
            {view.kind === "member" ? <MemberRewards offer={view.offer} /> : <GuestSteps />}
          </div>
          <div className="min-w-0 px-1 xl:px-0">{view.kind === "member" ? <MemberTicket offer={view.offer} /> : <GuestTicket />}</div>
        </div>
      </section>
    </div>
  );
}
