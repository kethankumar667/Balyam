import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Lock,
  Mail,
  Key,
  Laptop,
  Eye,
  Download,
  ShieldCheck,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import SettingsLayout from "../components/layout/SettingsLayout";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";
import { usePlayerId } from "../lib/playerIdentity";
import { downloadPlayerExport } from "../lib/privacy/exportData";
import { loadAccountDetails } from "../lib/accountGenerator";
import YourDataPanel from "../components/privacy/YourDataPanel";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export default function SecurityDataPage() {
  const authEmail = useAuthStore((s) => s.email);
  const isMember = useAuthStore((s) => s.isMember);
  const currentName = useRoomStore((s) => s.playerName);
  const currentAvatar = useRoomStore((s) => s.avatarId);
  const { playerId: effectivePlayerId } = usePlayerId();

  const [visibility, setVisibility] = useState<"public" | "friends">("public");

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* ── Section 1: Account Security ── */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-amber-500/20 dark:via-transparent dark:to-orange-500/10 shadow-xs">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 sm:p-6 space-y-4 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center justify-between border-b border-stone-200/60 dark:border-white/5 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center shadow-xs">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                    Account Security &amp; Credentials
                  </h2>
                  <p className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                    Verified session emails, HMAC seat cryptographic ownership &amp; passwords
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase text-stone-400 dark:text-slate-500 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Auth
              </span>
            </div>

            <div className="space-y-3">
              {/* Email Address */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/30 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider block">
                      Linked Email Account
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono font-bold text-stone-900 dark:text-white">
                        {authEmail ? maskEmail(authEmail) : "No email linked (Device Guest Session)"}
                      </span>
                      {authEmail && isMember ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                          Guest Mode
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isMember && (
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition shadow-xs self-start sm:self-auto min-h-[38px]"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Password Management */}
              {isMember && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-center shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider block">
                        Account Password
                      </span>
                      <span className="text-xs text-stone-500 dark:text-slate-400 font-medium">
                        Secured with cryptographic HMAC seat token validation
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-900 dark:text-white hover:bg-stone-50 dark:hover:bg-slate-700 transition self-start sm:self-auto min-h-[38px]"
                  >
                    <span>Change Password</span>
                  </Link>
                </div>
              )}

              {/* Active Sessions */}
              <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-white block">
                      Active Device Session
                    </span>
                    <span className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                      Current authenticated browser environment
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  ACTIVE NOW
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Privacy Controls ── */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-purple-500/20 dark:via-transparent dark:to-pink-500/10 shadow-xs">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 sm:p-6 space-y-4 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center gap-2.5 border-b border-stone-200/60 dark:border-white/5 pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/30 flex items-center justify-center shadow-xs">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                  Privacy &amp; Lounge Visibility
                </h2>
                <p className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                  Control who can inspect your game records and childhood badge collection
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-stone-50/70 dark:bg-[#151c2e]/70 border border-stone-200/60 dark:border-white/5">
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-white block">
                  Profile &amp; Stats Visibility
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400 font-medium">
                  Choose whether other lounge players can view your stats and achievements
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition min-h-[38px] cursor-pointer ${
                    visibility === "public"
                      ? "bg-amber-500 text-stone-950 font-black shadow-xs"
                      : "bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  Public Lounge
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("friends")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition min-h-[38px] cursor-pointer ${
                    visibility === "friends"
                      ? "bg-amber-500 text-stone-950 font-black shadow-xs"
                      : "bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700 hover:text-stone-900 dark:hover:text-white"
                  }`}
                >
                  Room Only
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Your Data & Account Deletion ── */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-200/90 via-stone-200/40 to-stone-200/90 dark:from-emerald-500/20 dark:via-transparent dark:to-cyan-500/10 shadow-xs">
          <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-md rounded-[22px] p-5 sm:p-6 space-y-4 border border-stone-200/60 dark:border-white/5">
            <div className="flex items-center gap-2.5 border-b border-stone-200/60 dark:border-white/5 pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                  Data Sovereignity &amp; Account Controls
                </h2>
                <p className="text-[11px] text-stone-400 dark:text-slate-400 font-medium">
                  Download an offline JSON archive of your matches or clear cached session state
                </p>
              </div>
            </div>

            <YourDataPanel hideHeading={true} />
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
