import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Sparkles, Gamepad2 } from "lucide-react";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { WhatsappGlyph } from "./icons";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="mt-8 pb-10 pt-4 max-w-[1240px] mx-auto space-y-5 text-[#5C3717]">
      <RevealOnScroll as="div" className="space-y-5">

        {/* Section 2: Middle Notebook Creator Card ("MADE BY") */}
        <div
          className="bhalyam-footer-card relative rounded-[32px] border border-[#E6D4B5]
                     overflow-hidden px-6 sm:px-12 py-8 sm:py-10 text-center shadow-md"
          style={{
            background: "linear-gradient(180deg, #FFFDF6 0%, #FAF2DF 100%)",
          }}
        >
          {/* Notebook Lined Paper Effect: Binder Margin Line & Hole Punches */}
          <div className="hidden sm:block absolute left-8 top-0 bottom-0 border-l border-[#F0A8A8]/60" />
          <div className="hidden sm:flex flex-col justify-around absolute left-2.5 top-8 bottom-8 pointer-events-none">
            <span className="w-3.5 h-3.5 rounded-full bg-[#E8D9C0] border border-[#D0BF9F] shadow-inner" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#E8D9C0] border border-[#D0BF9F] shadow-inner" />
            <span className="w-3.5 h-3.5 rounded-full bg-[#E8D9C0] border border-[#D0BF9F] shadow-inner" />
          </div>

          {/* Paper Plane Doodle at top right */}
          <PaperPlaneDoodleSVG className="hidden sm:block absolute right-6 top-4 w-20 h-16 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 sm:pl-8">

            {/* Left: Taped Photo Frame */}
            <div className="flex-shrink-0 relative group">
              <div className="relative rotate-[-2deg] bg-[#FFF8E7] p-2.5 border border-[#D4A574] rounded-xl shadow-md max-w-[210px] sm:max-w-[230px] transition-transform duration-300 hover:rotate-0">

                {/* Corner Tapes */}
                <span className="absolute -top-3 -left-3 w-10 h-4 bg-[#F2DFA8]/90 border border-[#D9BE7A] rotate-[-25deg] shadow-2xs pointer-events-none" />
                <span className="absolute -bottom-3 -right-3 w-10 h-4 bg-[#F2DFA8]/90 border border-[#D9BE7A] rotate-[20deg] shadow-2xs pointer-events-none" />

                <img
                  src="/Founder.png"
                  alt="Kethan Kumar Gontla"
                  className="w-full h-auto rounded-lg border border-[#E8D8BE] object-cover shadow-2xs"
                />
              </div>
            </div>

            {/* Middle: Signature & Quote */}
            <div className="flex-1 max-w-[500px]">
              <div className="text-[12px] font-extrabold tracking-widest text-[#9C7E63] uppercase flex items-center justify-center gap-1.5">
                <span>=</span> <span>MADE BY</span> <span>=</span>
              </div>

              <h3 className="bhalyam-script text-[36px] sm:text-[44px] font-extrabold text-[#4A2508] leading-none mt-1">
                Kethan Kumar Gontla
              </h3>

              <div className="text-[12px] font-bold text-[#E85D04] uppercase tracking-wider mt-1">
                Founder &amp; Creator of BHALYAM
              </div>

              <blockquote className="bhalyam-script text-[20px] sm:text-[23px] font-bold text-[#6D4323] leading-snug mt-3 px-2">
                “I wanted to build the place I wished existed when our school gang grew up.”
              </blockquote>

              {/* Social Buttons Row */}
              <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[13px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <InstagramGlyph className="w-4 h-4 text-[#E11D48]" />
                  <span>Instagram</span>
                </a>

                <a
                  href="https://wa.me/?text=Join%20me%20on%20BHALYAM%20-%20https%3A%2F%2Fbhalyam.onrender.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[13px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <WhatsappGlyph className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href="mailto:hello@bhalyam.app"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[13px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <MailGlyph className="w-4 h-4 text-[#2563EB]" />
                  <span>Email</span>
                </a>
              </div>
            </div>

            {/* Right: Pencil Jar, Dice & Pawns Asset */}
            <div className="hidden lg:flex flex-col items-center justify-center flex-shrink-0">
              <img
                src="/Foundersectionasset.png"
                alt="BHALYAM Pencil Jar, Dice &amp; Pawns"
                className="w-40 sm:w-48 h-auto object-contain drop-shadow-xs"
              />
            </div>

          </div>
        </div>

        {/* Section 3: Bottom Navigation Columns */}
        <div
          className="bhalyam-footer-card relative rounded-[32px] border border-[#E6D4B5]
                     overflow-hidden px-6 sm:px-10 py-8 sm:py-10 shadow-sm"
          style={{
            background: "linear-gradient(180deg, #FFF8E7 0%, #FAF0D9 100%)",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-6 text-left">

            {/* Brand Logo Column */}
            <div className="md:col-span-3">
              <img
                src="/FooterBhalyamlogo.png"
                alt="BHALYAM - Play Together. Remember Forever."
                className="w-48 sm:w-56 h-auto object-contain mb-1"
              />
            </div>

            {/* Links Columns: EXPLORE, SUPPORT, COMPANY, LEGAL */}
            <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-4">

              {/* EXPLORE */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  EXPLORE
                </h4>
                <ul className="space-y-1.5 text-[13px] font-medium text-[#7A5B3E]">
                  <li><Link to="/games" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">All Games</Link></li>
                  <li><a href="#rooms" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Rooms</a></li>
                  <li><a href="#how-it-works" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">How It Works</a></li>
                  <li><a href="#leaderboard" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Leaderboard</a></li>
                </ul>
              </div>

              {/* SUPPORT */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  SUPPORT
                </h4>
                <ul className="space-y-1.5 text-[13px] font-medium text-[#7A5B3E]">
                  <li><Link to="/about" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Help Center</Link></li>
                  <li><a href="#safety" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Safety Guide</a></li>
                  <li><a href="#rules" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Community Rules</a></li>
                  <li><a href="#report" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Report an Issue</a></li>
                </ul>
              </div>

              {/* COMPANY */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  COMPANY
                </h4>
                <ul className="space-y-1.5 text-[13px] font-medium text-[#7A5B3E]">
                  <li><Link to="/about" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">About BHALYAM</Link></li>
                  <li><Link to="/about" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Our Story</Link></li>
                  <li><a href="#careers" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Careers</a></li>
                  <li><a href="#press" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Press Kit</a></li>
                </ul>
              </div>

              {/* LEGAL */}
              <div>
                <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                  LEGAL
                </h4>
                <ul className="space-y-1.5 text-[13px] font-medium text-[#7A5B3E]">
                  <li><Link to="/privacy" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Privacy Notice</Link></li>
                  <li><a href="#terms" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Terms of Service</a></li>
                  <li><Link to="/profile" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Your Data &amp; Choices</Link></li>
                </ul>
              </div>

            </div>

            {/* STAY IN THE LOOP */}
            <div className="md:col-span-3">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-1.5">
                STAY IN THE LOOP
              </h4>
              <p className="text-[12px] leading-snug text-[#7A5B3E] mb-3">
                Get updates about new games, events and awesome 90s vibes.
              </p>

              <form onSubmit={handleSubscribe} className="relative mb-3">
                <div className="flex items-center bg-[#F7EBD3] rounded-xl p-1 border border-[#E4D1AC]">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-transparent text-xs text-[#4A2508] placeholder-[#9C7E63] px-2.5 focus:outline-none flex-1 min-w-0 font-medium"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-chest-600 hover:bg-chest-700 text-white text-xs font-bold rounded-lg px-3.5 py-1.5 transition-all shadow-xs active:scale-95 flex-shrink-0"
                  >
                    Subscribe
                  </button>
                </div>
                {subscribed && (
                  <span className="text-[11px] text-[#25D366] font-bold mt-1 block">
                    ✓ Thanks for subscribing!
                  </span>
                )}
              </form>

              {/* Social Icon Buttons */}
              <div className="flex items-center gap-2 mt-3">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <InstagramGlyph className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <WhatsappGlyph className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://www.facebook.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <MailGlyph className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://x.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X / Twitter"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </a>
                <a
                  href="#games"
                  aria-label="Games"
                  className="w-7 h-7 rounded-full border border-[#D9C4A3] bg-white text-[#5C3717] hover:bg-[#FBE7C6] flex items-center justify-center transition-all shadow-2xs"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Terms Links */}
          <div className="pt-4 border-t border-[#E8D9C0] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-semibold text-[#8C7053]">
            <div className="flex items-center gap-1.5">
              <span>© {new Date().getFullYear()} BHALYAM. Made with</span>
              <Heart className="w-3 h-3 text-[#E85D04] inline fill-current" />
              <span>for 90s Kids.</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link to="/privacy" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Privacy Notice</Link>
              <span>•</span>
              <a href="#terms" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Terms of Service</a>
              <span>•</span>
              <Link to="/profile" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Your Data Choices</Link>
              <span>•</span>
              <a href="#cookies" className="hover:text-[#E85D04] transition-colors flex items-center min-h-[44px]">Cookie Settings</a>
            </div>
          </div>

        </div>

      </RevealOnScroll>
    </footer>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function MailGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function PaperPlaneDoodleSVG({ className = "w-20 h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 80" fill="none" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 65 Q 25 75 35 60 T 45 45" strokeDasharray="3 3" opacity="0.6" />
      <path d="M45 45 L90 15 L60 70 L48 52 L78 28 L45 45 Z" fill="#FFFDF5" />
      <path d="M48 52 L48 64 L56 57" fill="#5C3717" opacity="0.2" />
    </svg>
  );
}
