import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, ChevronDown, Gamepad2, Globe, Heart, Mail, Radio, ShieldCheck, Users, Wifi, Zap, type LucideIcon } from "lucide-react";
import BhalyamLogo from "../../components/bhalyam/BhalyamLogo";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../hooks/useTranslation";
import { LOCALE_BY_ID } from "../../i18n/types";
import { BASE_URL } from "../../seo/metadata";
import { FooterSystemPulse } from "./FooterSystemPulse";
import { PlaygroundSignoff, VerandaScene } from "./FooterArtwork";
import { WhatsappGlyph } from "./icons";

const FOCUS = "rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-footer-cyan";
const LINK = `group flex min-h-[44px] items-center justify-between gap-2 py-2 text-sm text-footer-soft transition-colors hover:text-footer-ink motion-reduce:transition-none ${FOCUS}`;
const UTILITY = `inline-flex min-h-[44px] items-center justify-center gap-2 px-3 text-xs text-footer-soft transition-colors hover:bg-footer-panel hover:text-footer-ink motion-reduce:transition-none ${FOCUS}`;

interface FooterNavGroupProps {
  title: string;
  icon: LucideIcon;
  links: readonly (readonly [label: string, to: string])[];
}

const NAVIGATION: readonly FooterNavGroupProps[] = [
  { title: "Play", icon: Gamepad2, links: [
    ["Games catalog", "/games"], ["How to play", "/how-to-play"],
    ["My Records", "/myrecords"], ["Tournaments", "/tournaments"],
  ] },
  { title: "Community", icon: Users, links: [
    ["Social Hub", "/social"], ["Our story", "/about#our-story"],
    ["Player testimonials", "/testimonials"], ["Write a review", "/reviews/write"],
    ["Contact us", "/contact"], ["Leave feedback", "/feedback"],
  ] },
  { title: "Trust", icon: ShieldCheck, links: [
    ["Safety Center", "/safety"], ["Community rules", "/community-rules"],
    ["Support & FAQs", "/support"], ["Privacy notice", "/privacy"],
    ["Terms", "/terms"], ["Your data choices", "/settings/security"],
    ["Cookie preferences", "/settings/security"],
  ] },
];

function FooterNavGroup({ title, icon: Icon, links }: FooterNavGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <section className="min-w-0 rounded-2xl border border-footer-edge/20 bg-footer-glass/75 px-4 lg:p-5">
    <h3 aria-label={title} className="text-sm font-semibold text-footer-ink">
      <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}
        className={`flex min-h-[56px] w-full items-center gap-3 text-left lg:hidden ${FOCUS}`}>
        <Icon size={17} className="text-footer-cyan" aria-hidden="true" />
        {title}<ChevronDown size={17} aria-hidden="true" className={`ml-auto transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
      </button>
      <span className="hidden items-center gap-2 lg:flex"><Icon size={17} className="text-footer-cyan" aria-hidden="true" />{title}</span>
    </h3>
    <div className="mt-3 hidden h-px w-8 bg-footer-cyan/60 lg:block" aria-hidden="true" />
    <ul id={id} className={`pb-3 lg:mt-3 lg:block lg:pb-0 ${expanded ? "" : "hidden"}`}>
      {links.map(([label, to]) => <li key={label}>
        <Link to={to} className={LINK}>
          <span className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5">{label}</span>
          <ArrowRight size={14} aria-hidden="true" className="shrink-0 text-footer-cyan opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
        </Link>
      </li>)}
    </ul>
  </section>;
}

function VerandaDispatch() {
  const emailId = useId();
  const noticeId = useId();
  return <section aria-labelledby={`${emailId}-heading`} className="relative isolate order-2 overflow-hidden rounded-3xl border border-footer-gold/25 bg-gradient-to-br from-footer-panel to-footer-night p-5 sm:p-8 lg:order-3 lg:col-span-12">
    <div className="pointer-events-none absolute -left-12 -top-24 h-64 w-64 rounded-full bg-footer-orange/10 blur-3xl" aria-hidden="true" />
    <div className="relative grid gap-7 lg:grid-cols-2 lg:items-center lg:gap-12">
      <div className="relative lg:pr-32">
        <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-footer-gold">
          <Radio size={15} aria-hidden="true" /> The Veranda Dispatch
        </p>
        <h3 id={`${emailId}-heading`} className="max-w-sm font-display text-2xl leading-snug text-footer-ink sm:text-3xl">A little nostalgia.<br />A new reason to play.</h3>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-footer-soft">A future home for new games, weekend cups, and stories worth passing on.</p>
        <VerandaScene />
      </div>
      <div className="min-w-0 rounded-2xl border border-footer-edge/20 bg-footer-night/65 p-4 sm:p-5">
        <p id={noticeId} className="mb-4 text-sm font-semibold text-footer-gold">Signups aren't open yet.</p>
        <label htmlFor={emailId} className="mb-2 block text-xs font-medium text-footer-soft">Email address</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input id={emailId} type="email" disabled placeholder="Available when Dispatch launches" aria-describedby={noticeId}
            className="min-h-[52px] min-w-0 flex-1 cursor-not-allowed rounded-xl border border-footer-mute/60 bg-footer-glass px-3 text-sm text-footer-soft placeholder:text-footer-mute disabled:opacity-100" />
          <button type="button" disabled className="inline-flex min-h-[52px] shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-footer-gold/40 bg-footer-gold/10 px-5 text-sm font-semibold text-footer-gold">
            Join Dispatch <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-footer-soft">We're not collecting email addresses here. Until then, there's a whole lounge to explore.</p>
        <Link to="/games" className={`mt-2 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-footer-gold hover:text-footer-ink ${FOCUS}`}>
          Explore games <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>;
}

const TRUST_CARDS = [
  { title: "Fair play engine", icon: ShieldCheck, accent: "text-footer-cyan", to: "/safety",
    description: "Multiplayer moves and results are checked by the server.", more: "About fair play" },
  { title: "Instant access", icon: Zap, accent: "text-footer-gold", to: "/how-to-play",
    description: "Open your browser and play. No app installation needed.", more: "Find your game" },
  { title: "Player-first", icon: Heart, accent: "text-footer-mint", to: "/terms",
    description: "No ads. No real-money gambling. Just time well played.", more: "Our commitment" },
  { title: "Room voice", icon: Wifi, accent: "text-footer-cyan", to: "/privacy",
    description: "Optional WebRTC room audio with encrypted transport.", more: "Voice & privacy" },
] as const;

export function Footer() {
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => { setClientReady(true); }, []);
  const canAccessAdmin = useAuthStore(state => state.capabilities.accessAdminPanel);
  const { locale } = useTranslation();
  const language = clientReady ? LOCALE_BY_ID[locale] : null;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`Same games. Bigger memories. Join me on BHALYAM: ${BASE_URL}`)}`;

  return <footer className="bhalyam-footer relative z-10 mt-6 w-full shrink-0 overflow-hidden border-t border-footer-edge/20 bg-gradient-to-br from-footer-night via-footer-night to-footer-deep text-left text-footer-ink sm:mt-10">
    <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-footer-cyan/5 blur-3xl" aria-hidden="true" />
    <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-y-9 px-4 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-12 lg:gap-x-8 lg:px-8">
      <section aria-label="BHALYAM signoff" className="order-1 min-w-0 lg:col-span-4">
        <Link to="/" aria-label="BHALYAM home" className={`inline-flex min-h-[52px] items-center gap-3 ${FOCUS}`}>
          <BhalyamLogo size={48} decorative />
          <span className="font-display text-2xl tracking-wide text-footer-ink">BHALYAM</span>
        </Link>
        <h2 className="mt-5 font-display text-3xl leading-tight tracking-tight text-footer-ink sm:text-4xl">Same games.<br /><span className="text-footer-gold">Bigger memories.</span></h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-footer-soft">A timeless multiplayer lounge for nostalgic games, friendly banter, and fair competition.</p>
        <p className="mt-4 flex items-center gap-2 text-xs text-footer-soft"><Heart size={13} className="shrink-0 text-footer-gold" aria-hidden="true" />Made for memories, built for fair play.</p>
        <FooterSystemPulse />
      </section>

      <nav aria-label="Footer navigation" className="order-3 grid min-w-0 gap-3 lg:order-2 lg:col-span-8 lg:grid-cols-3 lg:items-start">
        {NAVIGATION.map(group => <FooterNavGroup key={group.title} {...group} />)}
      </nav>

      <VerandaDispatch />

      <section aria-labelledby="footer-trust-heading" className="order-4 min-w-0 lg:col-span-12">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 id="footer-trust-heading" className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-footer-soft">Why BHALYAM feels different</h3>
          <span className="hidden items-center gap-2 text-xs text-footer-mute sm:inline-flex"><BookOpen size={14} aria-hidden="true" />Old-school heart. Thoughtful technology.</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TRUST_CARDS.map(({ title, icon: Icon, accent, to, description, more }) => <Link key={title} to={to}
            className={`group flex min-w-0 flex-col rounded-2xl border border-footer-edge/20 bg-footer-glass/75 p-4 transition-colors hover:border-footer-edge/50 hover:bg-footer-panel/90 motion-reduce:transition-none sm:p-5 ${FOCUS}`}>
            <Icon size={24} aria-hidden="true" className={`mb-4 ${accent}`} strokeWidth={1.5} />
            <h4 className="text-sm font-semibold text-footer-ink">{title}</h4>
            <p className="mb-5 mt-2 text-xs leading-relaxed text-footer-soft">{description}</p>
            <span className={`mt-auto inline-flex items-center gap-1 text-[11px] font-medium ${accent}`}>{more}<ArrowRight size={12} className="shrink-0" aria-hidden="true" /></span>
          </Link>)}
        </div>
      </section>

      <PlaygroundSignoff />

      <div className="order-6 min-w-0 border-t border-footer-edge/20 bg-footer-glass/40 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 lg:col-span-12">
        <div className="flex flex-col items-center justify-between gap-3 lg:flex-row lg:flex-wrap">
          <p className="text-xs text-footer-soft">© 2026 BHALYAM. All rights reserved.</p>
          <nav aria-label="Footer legal" className="flex flex-wrap justify-center">
            <Link to="/privacy" className={UTILITY}>Privacy</Link>
            <Link to="/terms" className={UTILITY}>Terms</Link>
            <Link to="/settings/security" className={UTILITY}>Data choices</Link>
            <Link to="/settings/security" className={UTILITY}>Cookie preferences</Link>
          </nav>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link to="/settings/preferences" aria-label={language ? `Language: ${language.englishName}. Open language settings` : "Open language settings"} className={`${UTILITY} border border-footer-edge/25`}>
              <Globe size={16} aria-hidden="true" /><span lang={language?.tag}>{language?.nativeName ?? "Language"}</span><ChevronDown size={13} aria-hidden="true" />
            </Link>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className={UTILITY}>
              <WhatsappGlyph className="h-4 w-4" /><span>WhatsApp</span>
            </a>
            <a href="mailto:hello@bhalyam.app" aria-label="Email support" className={UTILITY}><Mail size={16} aria-hidden="true" /><span>Email</span></a>
          </div>
        </div>
        {clientReady && canAccessAdmin && <details className="mt-3 rounded-xl border border-footer-edge/20 px-3">
          <summary className={`min-h-[44px] cursor-pointer py-3 text-xs font-medium text-footer-soft ${FOCUS}`}>Admin tools</summary>
          <div className="flex flex-wrap gap-2 pb-3">
            <Link to="/admin" className={UTILITY}>Admin console</Link>
            <Link to="/design-system" className={UTILITY}>Design System</Link>
            <Link to="/diagnostics" className={UTILITY}>Diagnostics console</Link>
          </div>
        </details>}
      </div>
    </div>
  </footer>;
}
