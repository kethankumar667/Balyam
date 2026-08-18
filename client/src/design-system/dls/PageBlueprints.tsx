import React from "react";
import { SPACING } from "./Spacing";
import { TYPOGRAPHY } from "./Typography";

interface StandardLoungePageLayoutProps {
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  backLink?: React.ReactNode;
  className?: string;
}

export const StandardLoungePageLayout: React.FC<StandardLoungePageLayoutProps> = ({
  children,
  headerAction,
  backLink,
  className = "",
}) => {
  return (
    <div className={`min-h-screen bhalyam-paper ${SPACING.pagePadding} ${className}`}>
      <div className={SPACING.pageMaxWidth}>
        {(backLink || headerAction) && (
          <div className="flex items-center justify-between gap-4">
            {backLink && <div>{backLink}</div>}
            {headerAction && <div className="ml-auto">{headerAction}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

interface SectionHeaderBlockProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export const SectionHeaderBlock: React.FC<SectionHeaderBlockProps> = ({
  title,
  subtitle,
  action,
  badge,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-800/60 dark:border-zinc-800/60">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className={TYPOGRAPHY.sectionHeader}>{title}</h2>
          {badge}
        </div>
        {subtitle && <p className={TYPOGRAPHY.bodySubtle}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

interface DashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  children,
  columns = 3,
  className = "",
}) => {
  const getColStyles = () => {
    switch (columns) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 md:grid-cols-2";
      case 4:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
      case 3:
      default:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    }
  };

  return <div className={`grid ${getColStyles()} ${SPACING.gridGap} ${className}`}>{children}</div>;
};
