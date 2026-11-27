import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Globe, Headphones, Heart, Mail, ShieldCheck, Users, Zap, type LucideIcon } from "lucide-react";
import BhalyamLogo from "../../components/bhalyam/BhalyamLogo";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../hooks/useTranslation";
import { LOCALE_BY_ID } from "../../i18n/types";
import { BASE_URL } from "../../seo/metadata";
import { PlaygroundArtwork } from "./FooterArtwork";
import { WhatsappGlyph } from "./icons";

/** Every major band shares this container, so the CTA, columns, trust strip and legal bar line up. */
const FRAME = "mx-auto max-w-7xl px-6 sm:px-8 lg:px-12";
const FOCUS = "rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-footer-cyan";
/** 44px on touch screens; a tighter pitch where the pointer is a mouse. */
const LINK = `inline-flex min-h-[44px] items-center py-0.5 text-base text-footer-soft underline-offset-4 transition-colors hover:text-footer-cyan hover:underline motion-reduce:transition-none [@media(pointer:fine)]:min-h-[38px] ${FOCUS}`;
const UTILITY = `inline-flex min-h-[44px] items-center justify-center gap-2 px-3 text-sm text-footer-soft underline-offset-4 transition-colors hover:text-footer-cyan hover:underline motion-reduce:transition-none ${FOCUS}`;

interface NavGroup {
  title: string;
  icon: LucideIcon;
  links: readonly (readonly [label: string, to: string])[];
}

const NAVIGATION: readonly NavGroup[] = [
  { title: "Play", icon: Gamepad2, links: [
    ["Games catalogue", "/games"], ["How to play", "/how-to-play"], ["My records", "/myrecords"],
  ] },
  { title: "Community", icon: Users, links: [
    ["Our story", "/about#our-story"], ["Player stories", "/testimonials"],
    ["Contact us", "/contact"], ["Leave feedback", "/feedback"],
  ] },
  { title: "Help & trust", icon: ShieldCheck, links: [
    ["Safety centre", "/safety"], ["Community rules", "/community-rules"],
    ["Support & FAQs", "/support"], ["Privacy notice", "/privacy"],
  ] },
];

const PRINCIPLES = [
  { title: "Fair play", description: "Server-checked moves", icon: ShieldCheck, accent: "text-footer-cyan" },
  { title: "Instant access", description: "Play in your browser", icon: Zap, accent: "text-footer-gold" },
  { title: "Player-first", description: "No real-money gambling", icon: Heart, accent: "text-footer-cyan" },
  { title: "Room voice", description: "Optional in-room audio", icon: Headphones, accent: "text-footer-gold" },
] as const;

export function Footer() {
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => { setClientReady(true); }, []);
  const canAccessAdmin = useAuthStore(state => state.capabilities.accessAdminPanel);
  const { locale } = useTranslation();
  const language = clientReady ? LOCALE_BY_ID[locale] : null;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`Same games. Bigger memories. Join me on BHALYAM: ${BASE_URL}`)}`;

  return <>
    <footer className="bhalyam-footer relative z-10 mt-6 w-full shrink-0 border-t border-footer-edge/20 bg-footer-night text-left text-footer-ink sm:mt-10">
      <div className={`${FRAME} pt-8 sm:pt-10`}>
        <section aria-labelledby="footer-cta-heading" className="flex flex-col gap-4 rounded-3xl border border-footer-edge/30 bg-footer-glass px-5 py-5 sm:px-8 sm:py-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0">
            <h2 id="footer-cta-heading" className="font-display text-2xl leading-tight text-balance text-footer-ink sm:text-[2rem] xl:text-4xl">Your next memory starts with a game.</h2>
            <p className="mt-1 text-base text-footer-soft">Classic games. Familiar faces. New stories.</p>
          </div>
          <Link to="/games" className={`inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-full bg-footer-action px-7 text-base font-semibold text-footer-action-ink transition-opacity hover:opacity-90 motion-reduce:transition-none ${FOCUS}`}>
            Explore games <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>

        <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-3 xl:grid-cols-[1.5fr_1fr_1.1fr_1.15fr] xl:gap-x-10">
          <section aria-label="About BHALYAM" className="min-w-0 sm:col-span-3 xl:col-span-1">
            <Link to="/" aria-label="BHALYAM home" className={`inline-flex min-h-[44px] items-center gap-2.5 ${FOCUS}`}>
              <BhalyamLogo size={40} decorative shadow={false} />
              <span className="font-display text-xl tracking-wider text-footer-ink">BHALYAM</span>
            </Link>
            <p className="mt-3 font-display text-2xl leading-[1.15] tracking-tight text-footer-ink sm:text-[1.75rem]">Same games.<br /><span className="text-footer-gold">Bigger memories.</span></p>
            <p className="mt-2 max-w-xs text-base leading-relaxed text-footer-soft">A nostalgic playground for classic games and time together.</p>
          </section>

          {NAVIGATION.map(({ title, icon: Icon, links }) => <nav key={title} aria-label={`Footer ${title}`} className="min-w-0">
            <h3 className="flex min-h-[40px] items-center gap-3 text-lg font-semibold text-footer-ink">
              <Icon size={24} strokeWidth={1.5} className="shrink-0 text-footer-cyan" aria-hidden="true" />{title}
            </h3>
            <ul className="mt-1">
              {links.map(([label, to]) => <li key={label}><Link to={to} className={LINK}>{label}</Link></li>)}
            </ul>
          </nav>)}
        </div>

        <section aria-label="BHALYAM principles" className="mt-8">
          <ul className="grid gap-4 rounded-2xl border border-footer-edge/25 bg-footer-glass px-5 py-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0 xl:px-3 xl:py-3">
            {PRINCIPLES.map(({ title, description, icon: Icon, accent }) => <li key={title}
              className="flex min-w-0 items-center gap-3 xl:relative xl:px-4 xl:first:pl-2 xl:before:absolute xl:before:left-0 xl:before:top-1/2 xl:before:h-10 xl:before:w-px xl:before:-translate-y-1/2 xl:before:bg-footer-edge/20 xl:first:before:hidden">
              <Icon size={28} strokeWidth={1.5} className={`shrink-0 ${accent}`} aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-footer-ink">{title}</h3>
                <p className="text-sm text-footer-soft">{description}</p>
              </div>
            </li>)}
          </ul>
        </section>
      </div>

      <div className="mt-5"><PlaygroundArtwork /></div>

      <div className="border-t border-footer-edge/35 pb-[env(safe-area-inset-bottom)]">
        <div className={`${FRAME} py-3`}>
          <div className="flex flex-col items-center gap-0.5 xl:flex-row xl:justify-between xl:gap-6">
            <p suppressHydrationWarning className="text-sm text-footer-soft">© {new Date().getFullYear()} BHALYAM</p>
            <nav aria-label="Footer legal" className="flex flex-wrap justify-center">
              <Link to="/privacy" className={UTILITY}>Privacy</Link>
              <Link to="/terms" className={UTILITY}>Terms</Link>
              <Link to="/settings/security" className={UTILITY}>Data choices</Link>
              <Link to="/settings/security" className={UTILITY}>Cookie preferences</Link>
            </nav>
            <div className="flex flex-wrap items-center justify-center xl:justify-end">
              <Link to="/settings/preferences" aria-label={language ? `Language: ${language.englishName}. Open language settings` : "Open language settings"} className={UTILITY}>
                <Globe size={18} aria-hidden="true" /><span lang={language?.tag}>{language?.nativeName ?? "Language"}</span>
              </Link>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className={UTILITY}>
                <WhatsappGlyph className="h-[18px] w-[18px]" /><span>WhatsApp</span>
              </a>
              <a href="mailto:hello@bhalyam.app" aria-label="Email support" className={UTILITY}><Mail size={18} aria-hidden="true" /><span>Email</span></a>
            </div>
          </div>
        </div>
      </div>
    </footer>

    {/* Staff-only. Outside the player-facing footer, so the public page ends after the utility row. */}
    {clientReady && canAccessAdmin && <div data-admin-strip className="bhalyam-footer border-t border-dashed border-footer-edge/40 bg-footer-deep text-footer-ink">
      <div className={FRAME}>
        <details>
          <summary className={`min-h-[44px] cursor-pointer py-3 text-sm font-medium text-footer-soft ${FOCUS}`}>Admin tools</summary>
          <div className="flex flex-wrap gap-2 pb-3">
            <Link to="/admin" className={UTILITY}>Admin console</Link>
            <Link to="/design-system" className={UTILITY}>Design System</Link>
            <Link to="/diagnostics" className={UTILITY}>Diagnostics console</Link>
          </div>
        </details>
      </div>
    </div>}
  </>;
}
