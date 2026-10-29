import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Share2 } from "lucide-react";
import type { InvitePromoOffer } from "../../store/invitePromoStore";
import { useInviteActions } from "./useInviteActions";

/** The tear-off stub is a fixed height so the two perforation notches can sit exactly on its top edge. */
const STUB_PX = 76;
const NOTCH_RADIUS_PX = 11;
const NOTCHES = `radial-gradient(circle ${NOTCH_RADIUS_PX}px at 0 calc(100% - ${STUB_PX}px), #0000 97%, #000), radial-gradient(circle ${NOTCH_RADIUS_PX}px at 100% calc(100% - ${STUB_PX}px), #0000 97%, #000)`;
/** Thin and thick bars, in the rhythm of a real barcode. Purely decorative. */
const BARCODE = "repeating-linear-gradient(90deg,#3A1A0A 0 2px,transparent 2px 4px,#3A1A0A 4px 5px,transparent 5px 9px,#3A1A0A 9px 12px,transparent 12px 14px)";

const STUB_BUTTON = "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A1A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBE08A] motion-reduce:transition-none";
const STUB_OUTLINE = `${STUB_BUTTON} border-2 border-[#3A1A0A]/70 bg-white/30 text-[#3A1A0A] hover:bg-white/55`;
const STUB_SOLID = `${STUB_BUTTON} bg-[#3A1A0A] text-[#FFE08A] hover:bg-[#2A1208]`;

interface TicketShellProps {
  code: ReactNode;
  caption: string;
  stub: ReactNode;
}

/**
 * A gold admission pass with a perforated stub. The notches are cut with a mask, so whatever is behind the ticket
 * (the photograph on a phone, the dark panel on a desktop) shows through them. The shadow lives on the wrapper,
 * because a mask would clip a shadow drawn on the ticket itself.
 */
function TicketShell({ code, caption, stub }: TicketShellProps) {
  return (
    <div className="-rotate-2 drop-shadow-[0_18px_26px_rgba(0,0,0,0.5)] motion-safe:animate-invite-ticket">
      <div
        style={{ WebkitMaskImage: NOTCHES, maskImage: NOTCHES, WebkitMaskComposite: "source-in", maskComposite: "intersect" }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFF4CC] via-[#FBE08A] to-[#F2B72E] text-[#3A1A0A]"
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent motion-safe:animate-cosmetic-sweep" />
        <div className="relative p-4 pb-3">
          <p className="m-0 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-[#8A4B12]">
            <span>Admit two</span>
            <span>Bhalyam pass</span>
          </p>
          {code}
          <p className="m-0 mt-1 text-xs font-semibold leading-snug text-[#6B3A12]">{caption}</p>
          <span aria-hidden="true" className="mt-3 block h-6 w-full opacity-70" style={{ backgroundImage: BARCODE }} />
        </div>
        <div className="relative flex items-center px-4" style={{ height: STUB_PX }}>
          <span aria-hidden="true" className="absolute inset-x-4 top-0 border-t-2 border-dashed border-[#8A4B12]/45" />
          {stub}
        </div>
      </div>
    </div>
  );
}

/** A member's own pass: their real code, with Copy and Share on the stub. */
export function MemberTicket({ offer }: { offer: InvitePromoOffer }) {
  const { copied, failed, codeRef, copyCode, share } = useInviteActions(offer.shareCode, offer.campaign.inviteeBonus);
  return (
    <div className="flex flex-col gap-2">
      <TicketShell
        code={
          <p ref={codeRef} data-testid="invite-showcase-code" className="m-0 mt-2 select-all break-all font-mono text-[21px] font-black leading-tight tracking-[0.05em] sm:text-2xl">
            {offer.shareCode}
          </p>
        }
        caption="You and one friend. Give them this code when they join."
        stub={
          <div className="grid w-full grid-cols-2 gap-2">
            <button type="button" onClick={() => void copyCode()} className={STUB_OUTLINE}>
              {copied === "code" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copied === "code" ? "Copied" : "Copy code"}
            </button>
            <button type="button" onClick={() => void share()} className={STUB_SOLID}>
              <Share2 size={16} aria-hidden="true" /> Share
            </button>
          </div>
        }
      />
      {/* Announced to a screen reader either way; drawn on screen only when there is something to act on. */}
      <p role="status" aria-live="polite" className={failed ? "m-0 text-center text-[11px] leading-snug text-amber-100" : "sr-only"}>
        {failed ? "Your browser blocked copying. The code is selected, so you can copy it by hand." : copied === "code" ? "Code copied." : ""}
      </p>
      <Link to="/referrals" className="inline-flex min-h-[44px] items-center justify-center text-xs font-bold text-amber-200 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
        See who joined
      </Link>
    </div>
  );
}

/** A guest has no code yet, so their pass is locked: the way to unlock it is the one button on the stub. */
export function GuestTicket() {
  return (
    <TicketShell
      code={
        <>
          <p aria-hidden="true" className="m-0 mt-2 font-mono text-[21px] font-black leading-tight tracking-[0.05em] text-[#3A1A0A]/55 sm:text-2xl">BHALYAM-•••••</p>
          <span className="sr-only">Your invite code appears here once you have an account.</span>
        </>
      }
      caption="Your code unlocks the moment you create a free account."
      stub={
        <Link to="/signup" className={STUB_SOLID}>
          Create an account
        </Link>
      }
    />
  );
}
