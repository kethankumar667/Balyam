import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Smile, Shield, Download, Check, ChevronRight } from "lucide-react";

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
    <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#F3EFE9] dark:border-[#202740] pb-3.5">
        <Zap className="w-4 h-4 text-[#EA580C] fill-[#EA580C]" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          Quick Actions
        </h3>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Change Avatar */}
        <button
          type="button"
          onClick={onOpenAvatarPicker}
          className="w-full p-2.5 rounded-2xl bg-white hover:bg-slate-50/80 dark:bg-[#131728] dark:hover:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#202740] flex items-center justify-between transition group min-h-[44px] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FEFCE8] text-[#CA8A04] border border-[#FEF08A] flex items-center justify-center shrink-0">
              <Smile className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Change Avatar
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                Customise your profile picture
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Privacy & Transparency */}
        <Link
          to="/privacy"
          className="w-full p-2.5 rounded-2xl bg-white hover:bg-slate-50/80 dark:bg-[#131728] dark:hover:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#202740] flex items-center justify-between transition group min-h-[44px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Privacy & Transparency
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                Manage privacy and data settings
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              DPDP Act
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Download My Data */}
        <button
          type="button"
          onClick={handleDownload}
          className="w-full p-2.5 rounded-2xl bg-white hover:bg-slate-50/80 dark:bg-[#131728] dark:hover:bg-[#1A2035] border border-[#F3EFE9] dark:border-[#202740] flex items-center justify-between transition group min-h-[44px] cursor-pointer"
          aria-label="Download your player data JSON export"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FAF5FF] text-[#9333EA] border border-[#F3E8FF] flex items-center justify-center shrink-0">
              {downloaded ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {downloaded ? "Data Exported!" : "Download My Data"}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                Export your data in JSON format
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-md border border-[#BBF7D0]">
              JSON
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}
