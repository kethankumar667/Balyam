import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Smile, Shield, Download, Check, ChevronRight, Share2 } from "lucide-react";

interface ProfileQuickActionsProps {
  onOpenAvatarPicker: () => void;
  onExportData: () => void;
  onDeleteAccount?: () => void;
  playerId?: string;
}

export default function ProfileQuickActions({
  onOpenAvatarPicker,
  onExportData,
  onDeleteAccount,
  playerId,
}: ProfileQuickActionsProps) {
  const [downloaded, setDownloaded] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleDownload = () => {
    onExportData();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const handleCopyShare = async () => {
    try {
      const shareUrl = window.location.href;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#0c1424] via-[#121c33] to-[#090e1c] border-2 border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3.5 relative z-10">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-[0_2px_0_rgba(180,83,9,1)]">
          <Zap className="w-4 h-4 fill-stone-950 text-stone-950" />
        </div>
        <h3 className="font-black text-sm text-white tracking-tight">
          Quick Actions
        </h3>
      </div>

      {/* Chunky 3D Action Buttons */}
      <div className="space-y-2.5 relative z-10">
        {/* Change Avatar */}
        <button
          type="button"
          onClick={onOpenAvatarPicker}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#162238] to-[#0e1626] hover:from-[#1c2c47] hover:to-[#121c31] border-2 border-amber-500/30 hover:border-amber-400/60 flex items-center justify-between transition group min-h-[48px] cursor-pointer shadow-[0_3px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Smile className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-xs font-black text-white block">
                Change Avatar
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                Customize your profile icon
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Share Profile Link */}
        <button
          type="button"
          onClick={handleCopyShare}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#162238] to-[#0e1626] hover:from-[#1c2c47] hover:to-[#121c31] border-2 border-emerald-500/30 hover:border-emerald-400/60 flex items-center justify-between transition group min-h-[48px] cursor-pointer shadow-[0_3px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
              {copiedId ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </div>
            <div className="text-left">
              <span className="text-xs font-black text-white block">
                {copiedId ? "Profile Link Copied!" : "Share Profile"}
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                {playerId ? `ID: ${playerId.slice(0, 10)}...` : "Invite lounge friends"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/50 font-mono">
              {copiedId ? "Copied" : "Copy"}
            </span>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Privacy & Transparency */}
        <Link
          to="/privacy"
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#162238] to-[#0e1626] hover:from-[#1c2c47] hover:to-[#121c31] border-2 border-blue-500/30 hover:border-blue-400/60 flex items-center justify-between transition group min-h-[48px] shadow-[0_3px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-xs font-black text-white block">
                Privacy & Data
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                Consent & transparency
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-500/50 font-mono">
              DPDP Act
            </span>
            <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Download My Data */}
        <button
          type="button"
          onClick={handleDownload}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#162238] to-[#0e1626] hover:from-[#1c2c47] hover:to-[#121c31] border-2 border-purple-500/30 hover:border-purple-400/60 flex items-center justify-between transition group min-h-[48px] cursor-pointer shadow-[0_3px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-none"
          aria-label="Download your player data JSON export"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-inner">
              {downloaded ? (
                <Check className="w-5 h-5 text-emerald-400" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </div>
            <div className="text-left">
              <span className="text-xs font-black text-white block">
                {downloaded ? "Data Exported!" : "Download Dossier"}
              </span>
              <span className="text-[11px] text-stone-400 font-normal">
                Export gameplay history
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-500/50 font-mono">
              JSON
            </span>
            <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Discreet Security Footer Link for Account Deletion */}
      {onDeleteAccount && (
        <div className="pt-2 border-t border-white/10 text-center relative z-10">
          <button
            type="button"
            onClick={onDeleteAccount}
            className="text-[11px] text-stone-400 hover:text-rose-400 transition cursor-pointer font-bold min-h-[44px] px-3 py-2 inline-flex items-center justify-center"
          >
            Need to permanently erase profile? Delete Account
          </button>
        </div>
      )}
    </div>
  );
}
