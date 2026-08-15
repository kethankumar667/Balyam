import { useState } from "react";
import { Link } from "react-router-dom";
import { DATA_INVENTORY, THIRD_PARTIES } from "../lib/privacy/dataInventory";
import {
  GRIEVANCE_ACK_DAYS,
  GRIEVANCE_RESOLVE_DAYS,
  PRIVACY_CONTACT_EMAIL,
} from "../lib/privacy/contact";
import { ArrowLeftIcon } from "../components/auth/authIcons";

const LAST_UPDATED = "14 August 2026";

/* ────────────── Inline SVG Illustrations ────────────── */

function KidsLogoHeaderSVG({ className = "w-16 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="25" cy="18" r="8" stroke="#5C3717" strokeWidth="2" fill="#FFF8E7" />
      <path d="M18 16 Q 25 10 32 16" stroke="#5C3717" strokeWidth="2" fill="none" />
      <circle cx="22" cy="18" r="1" fill="#5C3717" />
      <circle cx="28" cy="18" r="1" fill="#5C3717" />
      <path d="M23 22 Q 25 24 27 22" stroke="#5C3717" strokeWidth="1.5" fill="none" />
      <path d="M25 26 L25 42 M16 31 L34 31 M25 42 L18 56 M25 42 L32 56" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" />

      <circle cx="60" cy="14" r="8" stroke="#5C3717" strokeWidth="2" fill="#FFF8E7" />
      <path d="M50 14 C 48 8, 54 8, 56 12" stroke="#5C3717" strokeWidth="2" fill="none" />
      <path d="M70 14 C 72 8, 66 8, 64 12" stroke="#5C3717" strokeWidth="2" fill="none" />
      <circle cx="57" cy="14" r="1" fill="#5C3717" />
      <circle cx="63" cy="14" r="1" fill="#5C3717" />
      <path d="M58 18 Q 60 20 62 18" stroke="#5C3717" strokeWidth="1.5" fill="none" />
      <path d="M60 22 L52 40 L68 40 Z M60 40 L54 54 M60 40 L66 54" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#FFF8E7" />

      <circle cx="95" cy="18" r="8" stroke="#5C3717" strokeWidth="2" fill="#FFF8E7" />
      <path d="M88 16 Q 95 10 102 16" stroke="#5C3717" strokeWidth="2" fill="none" />
      <circle cx="92" cy="18" r="1" fill="#5C3717" />
      <circle cx="98" cy="18" r="1" fill="#5C3717" />
      <path d="M93 22 Q 95 24 97 22" stroke="#5C3717" strokeWidth="1.5" fill="none" />
      <path d="M95 26 L95 42 M86 31 L104 31 M95 42 L88 56 M95 42 L102 56" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" />

      <path d="M32 31 Q 42 36 52 31" stroke="#5C3717" strokeWidth="2" fill="none" />
      <path d="M68 31 Q 78 36 86 31" stroke="#5C3717" strokeWidth="2" fill="none" />
    </svg>
  );
}

function NotebookShieldSVG({ className = "w-48 h-48" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Paper Plane Doodle background */}
      <path d="M15 45 Q 30 25 45 35 L60 20 L50 50 Z" stroke="#D4A574" strokeWidth="1.5" fill="none" strokeDasharray="3 3" opacity="0.7" />
      {/* Car Doodle background */}
      <path d="M15 165 L35 165 C 40 155 50 155 55 165 L85 165" stroke="#D4A574" strokeWidth="1.5" fill="none" opacity="0.7" />
      <circle cx="28" cy="165" r="4" fill="#FFFDF5" stroke="#D4A574" strokeWidth="1.5" />
      <circle cx="70" cy="165" r="4" fill="#FFFDF5" stroke="#D4A574" strokeWidth="1.5" />
      
      {/* Star Doodles */}
      <path d="M125 30 L127 35 L132 35 L128 38 L130 43 L125 40 L120 43 L122 38 L118 35 L123 35 Z" fill="#FFB703" opacity="0.8" />
      <path d="M185 80 L186 83 L189 83 L187 85 L188 88 L185 86 L182 88 L183 85 L181 83 L184 83 Z" fill="#E85D04" opacity="0.6" />

      {/* Notebook Body */}
      <rect x="75" y="35" width="105" height="135" rx="10" fill="#FFFDF5" stroke="#5C3717" strokeWidth="2.5" />
      <line x1="90" y1="35" x2="90" y2="170" stroke="#EAD9BC" strokeWidth="1.5" />

      {/* Binder Spiral Rings */}
      {[48, 64, 80, 96, 112, 128, 144, 160].map((y) => (
        <g key={y}>
          <path d={`M67 ${y} C 67 ${y-4}, 80 ${y-4}, 80 ${y}`} stroke="#5C3717" strokeWidth="2.8" fill="none" />
          <circle cx="80" cy={y} r="2" fill="#5C3717" />
        </g>
      ))}

      {/* Shield Icon on Notebook */}
      <path d="M138 68 C 138 68 158 68 158 68 C 158 98 138 115 138 115 C 138 115 118 98 118 68 Z" fill="#FFF8E7" stroke="#5C3717" strokeWidth="2.5" />
      {/* Lock inside Shield */}
      <rect x="131" y="87" width="14" height="12" rx="2.5" fill="#5C3717" />
      <path d="M134 87 V 82 C 134 79, 142 79, 142 82 V 87" stroke="#5C3717" strokeWidth="2.2" fill="none" />

      {/* Wooden Pencil beside Notebook */}
      <g transform="rotate(35 180 150)">
        <polygon points="170,120 182,120 182,165 176,175 170,165" fill="#E85D04" stroke="#5C3717" strokeWidth="1.8" />
        <polygon points="170,165 176,175 182,165" fill="#FCE7D0" stroke="#5C3717" strokeWidth="1" />
        <polygon points="174,171 176,175 178,171" fill="#4A2508" />
      </g>
    </svg>
  );
}

function TreasureChestSVG({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="25" y="45" width="70" height="40" rx="5" fill="#C68A4C" stroke="#5C3717" strokeWidth="2.5" />
      <path d="M25 45 C 25 22, 95 22, 95 45 Z" fill="#D99B5B" stroke="#5C3717" strokeWidth="2.5" />
      <line x1="25" y1="45" x2="95" y2="45" stroke="#5C3717" strokeWidth="2.5" />
      <rect x="54" y="40" width="12" height="16" rx="2" fill="#FFB703" stroke="#5C3717" strokeWidth="2" />
      <circle cx="60" cy="46" r="2" fill="#5C3717" />
      {/* Marbles/Toys inside chest */}
      <circle cx="40" cy="38" r="5.5" fill="#E85D04" />
      <circle cx="52" cy="34" r="4.5" fill="#2563EB" />
      <circle cx="70" cy="35" r="5.5" fill="#10B981" />
      <circle cx="82" cy="39" r="4.5" fill="#FFB703" />
      <circle cx="90" cy="35" r="3.5" fill="#E85D04" />
      <circle cx="33" cy="37" r="3.5" fill="#2563EB" />
    </svg>
  );
}

function ChalkboardKidsSVG({ className = "w-32 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Wooden Frame */}
      <rect x="10" y="10" width="120" height="80" rx="6" fill="#5C3717" stroke="#3A210D" strokeWidth="3" />
      {/* Inner Chalkboard */}
      <rect x="16" y="16" width="108" height="68" rx="3" fill="#2E4A3E" />
      
      {/* Sun drawing */}
      <circle cx="28" cy="28" r="5" stroke="#FFFDF5" strokeWidth="1.2" strokeDasharray="2 1" fill="none" />
      <line x1="28" y1="20" x2="28" y2="22" stroke="#FFFDF5" strokeWidth="1.2" />
      <line x1="28" y1="34" x2="28" y2="36" stroke="#FFFDF5" strokeWidth="1.2" />
      <line x1="20" y1="28" x2="22" y2="28" stroke="#FFFDF5" strokeWidth="1.2" />
      <line x1="34" y1="28" x2="36" y2="28" stroke="#FFFDF5" strokeWidth="1.2" />

      {/* Kids holding hands stick figures */}
      <g stroke="#FFFDF5" strokeWidth="1.3" fill="none">
        {/* Kid 1 */}
        <circle cx="50" cy="38" r="4" />
        <line x1="50" y1="42" x2="50" y2="58" />
        <line x1="42" y1="48" x2="58" y2="48" />
        <line x1="50" y1="58" x2="45" y2="70" />
        <line x1="50" y1="58" x2="55" y2="70" />

        {/* Kid 2 */}
        <circle cx="70" cy="36" r="4" />
        <line x1="70" y1="40" x2="70" y2="56" />
        <line x1="62" y1="46" x2="78" y2="46" />
        <line x1="70" y1="56" x2="65" y2="68" />
        <line x1="70" y1="56" x2="75" y2="68" />

        {/* Kid 3 */}
        <circle cx="90" cy="38" r="4" />
        <line x1="90" y1="42" x2="90" y2="58" />
        <line x1="82" y1="48" x2="98" y2="48" />
        <line x1="90" y1="58" x2="85" y2="70" />
        <line x1="90" y1="58" x2="95" y2="70" />
      </g>

      {/* Chalk piece on ledge */}
      <rect x="96" y="77" width="14" height="3.5" rx="1" fill="#FFFDF5" />
    </svg>
  );
}

function PhotoCardsStackSVG({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g transform="rotate(-12 60 50)">
        <rect x="30" y="15" width="60" height="70" rx="4" fill="#FFF8E7" stroke="#D4A574" strokeWidth="2" />
      </g>
      <g transform="rotate(-4 60 50)">
        <rect x="30" y="15" width="60" height="70" rx="4" fill="#FFF6E2" stroke="#C8965D" strokeWidth="2" />
      </g>
      <g transform="rotate(6 60 50)">
        <rect x="30" y="15" width="60" height="70" rx="4" fill="#FFFDF5" stroke="#5C3717" strokeWidth="2" />
        <circle cx="60" cy="40" r="10" stroke="#5C3717" strokeWidth="1.5" fill="#FFF8E7" />
        <path d="M52 37 Q 60 33 68 37" stroke="#5C3717" strokeWidth="1.5" fill="none" />
        <circle cx="56" cy="39" r="1" fill="#5C3717" />
        <circle cx="64" cy="39" r="1" fill="#5C3717" />
        <path d="M57 43 Q 60 45 63 43" stroke="#5C3717" strokeWidth="1.2" fill="none" />
        <path d="M60 50 L52 68 M60 50 L68 68" stroke="#5C3717" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function AlarmClockSVG({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M22 24 C 22 14, 37 14, 37 24 Z" fill="#5C3717" stroke="#3A210D" strokeWidth="2" />
      <path d="M78 24 C 78 14, 63 14, 63 24 Z" fill="#5C3717" stroke="#3A210D" strokeWidth="2" />
      <line x1="30" y1="80" x2="20" y2="92" stroke="#3A210D" strokeWidth="4" strokeLinecap="round" />
      <line x1="70" y1="80" x2="80" y2="92" stroke="#3A210D" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="55" r="32" fill="#FFFDF5" stroke="#3A210D" strokeWidth="3" />
      <circle cx="50" cy="55" r="28" fill="#FFF8E7" stroke="#D4A574" strokeWidth="1.5" />
      <line x1="50" y1="55" x2="50" y2="38" stroke="#3A210D" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="55" x2="66" y2="55" stroke="#3A210D" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="55" r="3" fill="#E85D04" />
    </svg>
  );
}

function FourKidsHoldingHandsSVG({ className = "w-36 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {[25, 75, 125, 175].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="20" r="9" stroke="#5C3717" strokeWidth="2.2" fill="#FFF8E7" />
          <path d={`M${x-6} 18 Q ${x} 14 ${x+6} 18`} stroke="#5C3717" strokeWidth="2" fill="none" />
          <circle cx={x-3} cy="20" r="1" fill="#5C3717" />
          <circle cx={x+3} cy="20" r="1" fill="#5C3717" />
          <path d={`M${x-3} 24 Q ${x} 26 ${x+3} 24`} stroke="#5C3717" strokeWidth="1.8" fill="none" />
          <path d={`M${x} 29 L${x} 48 M${x-8} 35 L${x+8} 35 M${x} 48 L${x-7} 64 M${x} 48 L${x+7} 64`} stroke="#5C3717" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ))}
      <path d="M33 35 Q 54 42 67 35" stroke="#5C3717" strokeWidth="2" fill="none" />
      <path d="M83 35 Q 104 42 117 35" stroke="#5C3717" strokeWidth="2" fill="none" />
      <path d="M133 35 Q 154 42 167 35" stroke="#5C3717" strokeWidth="2" fill="none" />
    </svg>
  );
}

/* ────────────── Navigation Items Configuration ────────────── */

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  to?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "sec-overview", label: "Overview", icon: "📖", href: "#overview" },
  { id: "sec-what-we-store", label: "What we store", icon: "💾", href: "#what-we-store" },
  { id: "sec-settings-progress", label: "Settings & Progress", icon: "⚙️", href: "#settings-progress" },
  { id: "sec-children", label: "Children & Guardianship", icon: "👨‍👩‍👧", href: "#children-guardianship" },
  { id: "sec-questions", label: "Questions & Complaints", icon: "💬", href: "#questions-complaints" },
  { id: "sec-changes", label: "When this changes", icon: "🔔", href: "#when-this-changes" },
  { id: "action-copy", label: "Take a copy", icon: "📥", to: "/profile" },
  { id: "action-correct", label: "Correct your data", icon: "✏️", to: "/profile" },
  { id: "action-erase", label: "Erase your data", icon: "🗑️", to: "/profile" },
  { id: "action-withdraw", label: "Withdraw consent", icon: "✋", to: "/profile" },
  { id: "action-see", label: "See what's held", icon: "👁️", to: "/profile" },
  { id: "action-contact", label: "Contact & Complaints", icon: "✉️", href: "#questions-complaints" },
];

/* ────────────── Main Component ────────────── */

export default function PrivacyPolicyPage() {
  const [activeTab, setActiveTab] = useState("sec-overview");

  return (
    <div className="min-h-screen bg-[#FAF3E0] font-sans text-[#5C3717] pb-16">
      
      {/* Top Header Bar */}
      <header className="max-w-[1240px] mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KidsLogoHeaderSVG className="w-16 h-8" />
          <h2 className="bhalyam-display text-[26px] font-extrabold text-[#4A2508] tracking-tight">
            BHALYAM
          </h2>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[13.5px] font-bold text-[#7A5B3E] hover:text-[#E85D04] transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to games
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* Hero Section */}
        <section id="overview" className="bg-[#FFFDF8] border border-[#E6D4B5] rounded-[32px] p-6 sm:p-10 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-[620px] text-left">
            <h1 className="bhalyam-display text-[36px] sm:text-[48px] font-extrabold text-[#4A2508] leading-tight">
              Privacy at BHALYAM
            </h1>
            <p className="text-[14.5px] sm:text-[15.5px] leading-relaxed text-[#7A5B3E] mt-3">
              The short version: everything stays on your device, there are no accounts yet, we
              sell nothing and track nothing. The long version is below, written to India&apos;s
              Digital Personal Data Protection Act, 2023.
            </p>
            <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-full bg-[#FFF8E7] border border-[#E6D4B5] text-[12.5px] font-semibold text-[#8C4A15]">
              <svg className="w-4 h-4 text-[#E85D04]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Last updated <span className="font-bold text-[#E85D04] ml-1">{LAST_UPDATED}</span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <NotebookShieldSVG className="w-48 h-48 sm:w-56 sm:h-56" />
          </div>
        </section>

        {/* Top 4 Feature Badges Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-4 flex items-center gap-3 text-left shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#FFF5E6] text-[#E85D04] border border-[#FCDDB5] flex items-center justify-center flex-shrink-0 text-lg">
              🎵
            </div>
            <div>
              <h4 className="font-extrabold text-[13.5px] text-[#4A2508] leading-tight">Retro Sounds</h4>
              <p className="text-[11.5px] text-[#7A5B3E] leading-tight">Relive the 90s with classic game sounds</p>
            </div>
          </div>

          <div className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-4 flex items-center gap-3 text-left shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#FFF5E6] text-[#E85D04] border border-[#FCDDB5] flex items-center justify-center flex-shrink-0 text-lg">
              🌅
            </div>
            <div>
              <h4 className="font-extrabold text-[13.5px] text-[#4A2508] leading-tight">Day / Night Theme</h4>
              <p className="text-[11.5px] text-[#7A5B3E] leading-tight">Play in your favorite 90s vibes</p>
            </div>
          </div>

          <div className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-4 flex items-center gap-3 text-left shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#FFF5E6] text-[#10B981] border border-[#A7F3D0] flex items-center justify-center flex-shrink-0 text-lg">
              🛡️
            </div>
            <div>
              <h4 className="font-extrabold text-[13.5px] text-[#4A2508] leading-tight">Safe &amp; Ad-free</h4>
              <p className="text-[11.5px] text-[#7A5B3E] leading-tight">100% safe for nostalgic fun</p>
            </div>
          </div>

          <div className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-4 flex items-center gap-3 text-left shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#FFF5E6] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center flex-shrink-0 text-lg">
              📱
            </div>
            <div>
              <h4 className="font-extrabold text-[13.5px] text-[#4A2508] leading-tight">Works on Mobile</h4>
              <p className="text-[11.5px] text-[#7A5B3E] leading-tight">Play with friends anytime, anywhere</p>
            </div>
          </div>
        </div>

        {/* 2-Column Main Layout: Sidebar Navigation + Detailed Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Sidebar Menu */}
          <aside className="md:col-span-4 lg:col-span-3 bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-3 shadow-xs sticky top-6 text-left">
            <nav className="space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                if (item.to) {
                  return (
                    <Link
                      key={item.id}
                      to={item.to}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-[#7A5B3E] hover:bg-[#FAF0D9] hover:text-[#E85D04] transition-colors"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                }
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                      isActive
                        ? "bg-[#FFF5E6] text-[#E85D04] border border-[#FCDDB5] font-bold shadow-2xs"
                        : "text-[#7A5B3E] hover:bg-[#FAF0D9] hover:text-[#E85D04]"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* Right Main Content Cards */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6 text-left">
            
            {/* Card 1: What we store, and why */}
            <section id="what-we-store" className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="max-w-[500px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[#E6F4EA] text-[#137333] flex items-center justify-center text-lg">
                    💾
                  </div>
                  <h3 className="text-[19px] font-extrabold text-[#4A2508]">What we store, and why</h3>
                </div>
                <p className="text-[13.5px] leading-relaxed text-[#7A5B3E]">
                  BHALYAM has no user accounts and no database. Everything listed here lives in
                  your browser&apos;s local storage on the device you are reading this on, and
                  never leaves it except where the next section says otherwise.
                </p>
              </div>

              <div className="self-center sm:self-auto flex-shrink-0">
                <TreasureChestSVG className="w-24 h-24" />
              </div>
            </section>

            {/* Card 2: Personal Data */}
            <section className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="max-w-[520px]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#E6F4EA] text-[#137333] flex items-center justify-center text-lg">
                    👤
                  </div>
                  <h3 className="text-[19px] font-extrabold text-[#4A2508]">Personal Data</h3>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#E6F4EA] text-[#137333] flex items-center justify-center text-[11px] font-bold mt-0.5 flex-shrink-0">
                      ✓
                    </span>
                    <div>
                      <h5 className="font-bold text-[13.5px] text-[#4A2508]">Player ID</h5>
                      <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                        A random id that identifies your seat at a table. Not a UUID — it embeds the moment the profile was first created.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#E6F4EA] text-[#137333] flex items-center justify-center text-[11px] font-bold mt-0.5 flex-shrink-0">
                      ✓
                    </span>
                    <div>
                      <h5 className="font-bold text-[13.5px] text-[#4A2508]">Display name</h5>
                      <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                        The name shown to everyone else at the table. You typed it yourself.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#E6F4EA] text-[#137333] flex items-center justify-center text-[11px] font-bold mt-0.5 flex-shrink-0">
                      ✓
                    </span>
                    <div>
                      <h5 className="font-bold text-[13.5px] text-[#4A2508]">Seat keys</h5>
                      <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                        Per-room proof that a seat is yours, so refreshing the page does not lose your place. Meaningless once the room ends.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="self-center sm:self-auto flex-shrink-0">
                <ChalkboardKidsSVG className="w-32 h-24" />
              </div>
            </section>

            {/* Card 3: Recent tables */}
            <section className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="max-w-[500px]">
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <div className="w-9 h-9 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center text-lg">
                    🎴
                  </div>
                  <h3 className="text-[18px] font-extrabold text-[#4A2508]">Recent tables</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] text-[11px] font-bold border border-[#BFDBFE]">
                    includes other players&apos; names
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-[#7A5B3E]">
                  The last three named Rummy tables you joined, including the display names of the other players at them.
                </p>
              </div>

              <div className="flex-shrink-0">
                <PhotoCardsStackSVG className="w-24 h-24" />
              </div>
            </section>

            {/* Card 4: Connection log */}
            <section className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="max-w-[500px]">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-9 h-9 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center text-lg">
                    📶
                  </div>
                  <h3 className="text-[18px] font-extrabold text-[#4A2508]">Connection log</h3>
                </div>
                <p className="text-[13px] leading-relaxed text-[#7A5B3E]">
                  Timestamped notes about connects and reconnects, used to debug dropped games. No message or game content.
                </p>
              </div>

              <div className="flex-shrink-0">
                <AlarmClockSVG className="w-20 h-20" />
              </div>
            </section>

          </div>
        </div>

        {/* Settings and Progress Full-Width Card */}
        <section id="settings-progress" className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-6 sm:p-8 shadow-xs text-left">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-[#FFF5E6] text-[#E85D04] border border-[#FCDDB5] flex items-center justify-center text-lg">
              ⚙️
            </div>
            <h3 className="text-[20px] font-extrabold text-[#4A2508]">Settings and Progress</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
            
            {/* Column 1 */}
            <div className="space-y-4">
              
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Your privacy choice</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Whether you allowed the optional settings and scores below, and when you chose. Kept so we do not ask again, and so the choice is demonstrable.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Avatar</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Which of the built-in avatars you picked. Just a filename — no photo of you is uploaded or stored.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Sound settings</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Music and effects volume, and whether sound is muted.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Vibration setting</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Whether the phone vibrates on your turn and on wins.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Language</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Which language the interface is shown in.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Theme</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Light or dark appearance.
                  </p>
                </div>
              </div>

            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Theme touched</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Whether you have ever changed the theme, so we stop suggesting it.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Board skin</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    The visual skin chosen for game boards.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Ludo settings</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Your saved Ludo preferences, such as board theme and coin colour.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Snake best score</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Your highest Snake score on this device.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Block Blast best score</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Your highest Block Blast score on this device.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#E85D04] mt-2 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-[13.5px] text-[#4A2508]">Tutorial seen</h5>
                  <p className="text-[12.5px] text-[#7A5B3E] leading-relaxed">
                    Whether you have seen the tutorial so they stop reappearing.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* 2-Column Section: Children & Guardianship + Questions & Complaints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          
          {/* Card 1: Children & Guardianship */}
          <section id="children-guardianship" className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center text-lg">
                  👨‍👩‍👧
                </div>
                <h3 className="text-[18px] font-extrabold text-[#4A2508]">Children and guardianship</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-[#7A5B3E]">
                BHALYAM is a family game lounge, so children will play it. Today the app collects
                no contact details, has no accounts, shows no advertising and sends nothing to a
                server that outlives the room — which is the safest arrangement we can offer while
                verifiable guardian consent is not yet built.
              </p>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#E85D04] hover:underline mt-4"
            >
              Know more →
            </Link>
          </section>

          {/* Card 2: Questions & Complaints */}
          <section id="questions-complaints" className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center text-lg">
                  💬
                </div>
                <h3 className="text-[18px] font-extrabold text-[#4A2508]">Questions and complaints</h3>
              </div>
              {PRIVACY_CONTACT_EMAIL ? (
                <p className="text-[13px] leading-relaxed text-[#7A5B3E]">
                  Write to{" "}
                  <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="font-bold text-[#E85D04] underline">
                    {PRIVACY_CONTACT_EMAIL}
                  </a>
                  . We acknowledge within {GRIEVANCE_ACK_DAYS} days and resolve within {GRIEVANCE_RESOLVE_DAYS} days.
                </p>
              ) : (
                <p className="text-[13px] leading-relaxed text-[#7A5B3E]">
                  A dedicated privacy contact is not published yet. Because nothing is stored
                  anywhere but your own device, the controls in your profile give you complete
                  access and erasure without needing to ask anyone. You may also complain to the
                  Data Protection Board of India.
                </p>
              )}
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#E85D04] hover:underline mt-4"
            >
              Know more →
            </Link>
          </section>

        </div>

        {/* Server Memory Disclaimer Full-Width Card */}
        <section id="when-this-changes" className="bg-[#FFF9EA] border border-[#F3E5C8] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5 text-left">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#FFFDF6] border border-[#E6D4B5] text-[#5C3717] flex items-center justify-center text-lg flex-shrink-0 shadow-2xs">
              🔒
            </div>
            <p className="text-[13px] leading-relaxed text-[#7A5B3E] max-w-[720px]">
              One limit worth stating plainly: while you are sitting in a room, the server holds your
              name and seat in memory so the table keeps working. Leave the room and it is gone —
              rooms are never written to disk, and a server restart erases every one.
            </p>
          </div>

          <div className="flex-shrink-0">
            <FourKidsHoldingHandsSVG className="w-36 h-12" />
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="max-w-[1240px] mx-auto px-6 pt-10 border-t border-[#E6D4B5]/60 mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] font-semibold text-[#8C6D4F]">
        <div>
          © {new Date().getFullYear()} BHALYAM · A Kethan Kumar Gontla project
        </div>
        <div className="flex items-center gap-1">
          Built solo with <span className="text-[#E11D48]">❤️</span> for every school-gang reunion
        </div>
      </footer>

    </div>
  );
}
