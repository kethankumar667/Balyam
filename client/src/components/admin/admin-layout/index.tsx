import { useState, type ReactNode } from "react";
import AdminSidebar from "../admin-sidebar";
import AdminTopbar from "../admin-topbar";

interface AdminLayoutProps {
  children: ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  systemStatus?: "healthy" | "warning" | "critical";
  onlineSockets?: number;
  className?: string;
}

export default function AdminLayout({
  children,
  onRefresh,
  isRefreshing = false,
  systemStatus = "healthy",
  onlineSockets,
  className = "",
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen min-h-[100dvh] w-full max-w-full overflow-hidden bg-[#FAF8F5] dark:bg-[#0B0F19] text-[var(--chrome-ink)] flex antialiased">
      {/* Collapsible / Responsive Navigation Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Sticky Top Header — flex-shrink-0 keeps it pinned at its full height
            even when page content below is taller than the viewport; without
            it the flex column silently compresses the header instead of
            scrolling (see AppLayout's AppHeader for the same convention). */}
        <AdminTopbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          systemStatus={systemStatus}
          onlineSockets={onlineSockets}
        />

        {/* Dynamic Page Content Canvas — the one scrollable region */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 ${className}`}>
          <div className="max-w-7xl w-full mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
