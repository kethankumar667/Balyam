import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Smile, Shield, Download, Check } from "lucide-react";

interface ProfileQuickActionsProps {
  onOpenAvatarPicker: () => void;
  onExportData: () => void;
}

export default function ProfileQuickActions({
  onOpenAvatarPicker,
  onExportData,
}: ProfileQuickActionsProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    onExportData();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[var(--auth-field-edge)] pb-3.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <h3 className="font-extrabold text-sm text-[var(--auth-ink)]">
          Quick Actions
        </h3>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onOpenAvatarPicker}
          className="w-full p-3 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] hover:border-amber-500/50 flex items-center justify-between text-xs font-bold text-[var(--auth-ink)] transition group min-h-[44px]"
        >
          <div className="flex items-center gap-3">
            <Smile className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>Change Avatar</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[var(--auth-ink-soft)]">
            Customise
          </span>
        </button>

        <Link
          to="/privacy"
          className="w-full p-3 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] hover:border-amber-500/50 flex items-center justify-between text-xs font-bold text-[var(--auth-ink)] transition group min-h-[44px]"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
            <span>Privacy & Transparency</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[var(--auth-ink-soft)]">
            DPDP Act
          </span>
        </Link>

        <button
          type="button"
          onClick={handleDownload}
          className="w-full p-3 rounded-2xl bg-[var(--auth-field)] border border-[var(--auth-field-edge)] hover:border-amber-500/50 flex items-center justify-between text-xs font-bold text-[var(--auth-ink)] transition group min-h-[44px]"
          aria-label="Download your player data JSON export"
        >
          <div className="flex items-center gap-3">
            {downloaded ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Download className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
            )}
            <span>{downloaded ? "Data Exported!" : "Download My Data"}</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-500">
            JSON
          </span>
        </button>
      </div>
    </div>
  );
}
