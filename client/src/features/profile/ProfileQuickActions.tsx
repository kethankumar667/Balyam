import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Smile, Shield, Download, Check, ChevronRight, Share2, Copy } from "lucide-react";

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
    <div className="bg-white/95 dark:bg-[#121829]/95 backdrop-blur-md border border-stone-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-stone-200/70 dark:border-white/10 pb-3.5">
        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
        <h3 className="font-bold text-sm text-stone-900 dark:text-white">
          Quick Actions
        </h3>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Change Avatar */}
        <button
          type="button"
          onClick={onOpenAvatarPicker}
          className="w-full p-2.5 rounded-2xl bg-stone-50/80 hover:bg-stone-100/90 dark:bg-[#182138] dark:hover:bg-[#1e2947] border border-stone-200/70 dark:border-white/5 flex items-center justify-between transition group min-h-[44px] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center shrink-0">
              <Smile className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-stone-900 dark:text-white block">
                Change Avatar
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                Customize your profile icon
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Share Profile Link */}
        <button
          type="button"
          onClick={handleCopyShare}
          className="w-full p-2.5 rounded-2xl bg-stone-50/80 hover:bg-stone-100/90 dark:bg-[#182138] dark:hover:bg-[#1e2947] border border-stone-200/70 dark:border-white/5 flex items-center justify-between transition group min-h-[44px] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
              {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-stone-900 dark:text-white block">
                {copiedId ? "Profile Link Copied!" : "Share Profile"}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                {playerId ? `ID: ${playerId.slice(0, 10)}...` : "Invite lounge friends"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800/50">
              {copiedId ? "Copied" : "Copy"}
            </span>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        {/* Privacy & Transparency */}
        <Link
          to="/privacy"
          className="w-full p-2.5 rounded-2xl bg-stone-50/80 hover:bg-stone-100/90 dark:bg-[#182138] dark:hover:bg-[#1e2947] border border-stone-200/70 dark:border-white/5 flex items-center justify-between transition group min-h-[44px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-stone-900 dark:text-white block">
                Privacy & Data
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                Consent & transparency
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/80 dark:border-blue-800/50">
              DPDP Act
            </span>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Download My Data */}
        <button
          type="button"
          onClick={handleDownload}
          className="w-full p-2.5 rounded-2xl bg-stone-50/80 hover:bg-stone-100/90 dark:bg-[#182138] dark:hover:bg-[#1e2947] border border-stone-200/70 dark:border-white/5 flex items-center justify-between transition group min-h-[44px] cursor-pointer"
          aria-label="Download your player data JSON export"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center shrink-0">
              {downloaded ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-stone-900 dark:text-white block">
                {downloaded ? "Data Exported!" : "Download Dossier"}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 font-normal">
                Export gameplay history
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200/80 dark:border-purple-800/50">
              JSON
            </span>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>

      {/* Discreet Security Footer Link for Account Deletion */}
      {onDeleteAccount && (
        <div className="pt-2 border-t border-stone-200/60 dark:border-white/5 text-center">
          <button
            type="button"
            onClick={onDeleteAccount}
            className="text-[11px] text-stone-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer font-medium min-h-[44px] px-3 py-2 inline-flex items-center justify-center"
          >
            Need to permanently erase profile? Delete Account
          </button>
        </div>
      )}
    </div>
  );
}
