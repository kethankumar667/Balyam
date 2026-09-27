import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Download, Share2, Shield, Smile, Trash2, Wrench } from "lucide-react";

interface ProfileQuickActionsProps {
  onOpenAvatarPicker: () => void;
  onExportData: () => void;
  onDeleteAccount?: () => void;
  playerId?: string;
}

const ACTION_CLASS = "group flex min-h-[60px] w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 dark:hover:bg-slate-800/70";

export default function ProfileQuickActions({
  onOpenAvatarPicker,
  onExportData,
  onDeleteAccount,
  playerId,
}: ProfileQuickActionsProps) {
  const [downloaded, setDownloaded] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const downloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const handleDownload = () => {
    onExportData();
    setDownloaded(true);
    if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
    downloadTimerRef.current = setTimeout(() => setDownloaded(false), 2500);
  };

  const handleCopyShare = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(window.location.href);
      setCopiedId(true);
      setCopyFailed(false);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(false), 2500);
    } catch {
      setCopiedId(false);
      setCopyFailed(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyFailed(false), 2500);
    }
  };

  const actionContent = (Icon: typeof Smile, label: string, detail: string) => (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-stone-950 dark:text-white">{label}</span>
          <span className="mt-0.5 block truncate text-sm text-stone-500 dark:text-slate-400">{detail}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 dark:text-slate-500" aria-hidden="true" />
    </>
  );

  return (
    <section
      aria-labelledby="profile-tools-heading"
      className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_18px_45px_-34px_rgba(41,37,36,0.45)] dark:border-slate-700/70 dark:bg-[#0D1424] dark:shadow-[0_24px_56px_-36px_rgba(0,0,0,0.9)]"
    >
      <header className="flex items-center gap-3 border-b border-stone-200/80 px-5 py-5 dark:border-slate-700/70">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
          <Wrench className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="profile-tools-heading" className="text-base font-bold text-stone-950 dark:text-white">Profile tools</h2>
          <p className="text-sm text-stone-500 dark:text-slate-400">Manage and share your account</p>
        </div>
      </header>

      <div className="divide-y divide-stone-200/80 dark:divide-slate-700/70">
        <button type="button" onClick={onOpenAvatarPicker} className={ACTION_CLASS}>
          {actionContent(Smile, "Change avatar", "Choose a new player portrait")}
        </button>
        <button type="button" onClick={handleCopyShare} className={ACTION_CLASS}>
          {actionContent(
            copiedId ? Check : Share2,
            copiedId ? "Profile link copied" : copyFailed ? "Copy unavailable" : "Share profile",
            copyFailed ? "Allow clipboard access and try again" : playerId ? `Player ID ${playerId.slice(0, 10)}…` : "Copy a link to this profile",
          )}
        </button>
        <Link to="/privacy" className={ACTION_CLASS}>
          {actionContent(Shield, "Privacy and data", "Review consent and transparency")}
        </Link>
        <button
          type="button"
          onClick={handleDownload}
          className={ACTION_CLASS}
          aria-label={downloaded ? "Player data downloaded" : "Download your player data JSON export"}
        >
          {actionContent(downloaded ? Check : Download, downloaded ? "Data exported" : "Download data", "JSON profile and game history")}
        </button>
      </div>

      {onDeleteAccount && (
        <div className="border-t border-stone-200/80 px-5 py-3 dark:border-slate-700/70">
          <button
            type="button"
            onClick={onDeleteAccount}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:bg-rose-400/10 dark:hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete account
          </button>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {copiedId ? "Profile link copied" : copyFailed ? "Profile link could not be copied" : downloaded ? "Player data downloaded" : ""}
      </p>
    </section>
  );
}