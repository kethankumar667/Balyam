import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, Mail, Key, Laptop, Eye, Download, Trash2, ShieldCheck, AlertTriangle, Check, ArrowRight } from "lucide-react";
import SettingsLayout from "../components/layout/SettingsLayout";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";
import { apiFetch, usePlayerId } from "../lib/playerIdentity";
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

  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "friends">("public");

  const handleDownloadData = () => {
    downloadPlayerExport(
      {
        playerId: effectivePlayerId || "guest_player",
        displayName: currentName,
        avatar: currentAvatar || undefined,
        joinedAt: Date.now() - 86400000 * 30,
        lastSeenAt: Date.now(),
        level: 1,
        experiencePoints: 0,
      },
      null,
      loadAccountDetails()
    );
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* ── Section 1: Account Security ── */}
        <section className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[var(--auth-field-edge)] pb-3">
            <Lock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black uppercase font-mono tracking-wider text-[var(--auth-ink)]">
              Account Security & Login
            </h2>
          </div>

          <div className="space-y-4">
            {/* Email Address */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] uppercase block">
                    Account Email
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[var(--auth-ink)] font-mono">
                      {authEmail ? maskEmail(authEmail) : "No email linked (Device Guest Session)"}
                    </span>
                    {authEmail && isMember && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isMember && (
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-stone-950 font-mono hover:bg-amber-400 transition shadow-2xs self-start sm:self-auto"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Password Management */}
            {isMember && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold text-[var(--auth-ink-soft)] uppercase block">
                      Account Password
                    </span>
                    <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                      Password is set and secured via HMAC seat tokens
                    </span>
                  </div>
                </div>

                <Link
                  to="/forgot-password"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--auth-card)] border border-[var(--auth-card-edge)] text-[var(--auth-ink)] hover:border-amber-500 transition self-start sm:self-auto"
                >
                  <span>Change Password</span>
                </Link>
              </div>
            )}

            {/* Active Sessions */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-[var(--auth-ink)] block">
                    Active Session
                  </span>
                  <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                    Current active browser on this device
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                ACTIVE NOW
              </span>
            </div>
          </div>
        </section>

        {/* ── Section 2: Privacy Controls ── */}
        <section className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[var(--auth-field-edge)] pb-3">
            <Eye className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black uppercase font-mono tracking-wider text-[var(--auth-ink)]">
              Privacy & Lounge Visibility
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)]">
              <div>
                <span className="text-sm font-extrabold text-[var(--auth-ink)] block">
                  Profile Visibility
                </span>
                <span className="text-xs text-[var(--auth-ink-soft)] font-medium">
                  Control whether other lounge players can view your stats and achievements
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition border cursor-pointer ${
                    visibility === "public"
                      ? "bg-amber-500 text-stone-950 border-amber-600 font-black shadow-xs"
                      : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] border-[var(--auth-card-edge)] hover:text-[var(--auth-ink)]"
                  }`}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("friends")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition border cursor-pointer ${
                    visibility === "friends"
                      ? "bg-amber-500 text-stone-950 border-amber-600 font-black shadow-xs"
                      : "bg-[var(--auth-card)] text-[var(--auth-ink-soft)] border-[var(--auth-card-edge)] hover:text-[var(--auth-ink)]"
                  }`}
                >
                  Room Only
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Your Data & Account Deletion ── */}
        <section className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[var(--auth-field-edge)] pb-3">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-black uppercase font-mono tracking-wider text-[var(--auth-ink)]">
              Your Data & Account Controls
            </h2>
          </div>

          <p className="text-xs text-[var(--auth-ink-soft)] font-medium">
            Download an offline copy of your gameplay data or permanently erase your account and session tokens.
          </p>

          <YourDataPanel hideHeading={true} />
        </section>
      </div>
    </SettingsLayout>
  );
}
