import React, { useCallback, useEffect, useState } from "react";
import {
  MessageSquareText,
  Star,
  Inbox,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import DataTable, { type Column } from "../../../components/admin/data-table";
import StatusBadge from "../../../components/admin/status-badge";
import FilterBar, { type FilterOption } from "../../../components/admin/filter-bar";
import DetailDrawer from "../../../components/admin/detail-drawer";
import InfoCard from "../../../components/admin/info-card";
import StarRating from "../../../components/StarRating";
import { getGameById } from "../../../catalog/gameCatalog";
import {
  adminListReviews,
  adminApproveReview,
  adminRejectReview,
  adminSetReviewFeatured,
  type ReviewRecord,
  type ReviewStatus,
} from "../../../lib/reviewsApi";
import { adminListFeedback, type FeedbackSubmissionRecord } from "../../../lib/feedbackApi";

type AdminTabId = "moderation" | "feedback";

function scopeLabel(review: ReviewRecord): string {
  if (!review.gameId) return "Platform-wide";
  return getGameById(review.gameId)?.name ?? review.gameId;
}

function reviewStatusVisual(status: ReviewStatus): "pending" | "completed" | "failed" {
  if (status === "approved") return "completed";
  if (status === "rejected") return "failed";
  return "pending";
}

/**
 * Reviews moderation queue + read-only feedback inbox.
 *
 * Two independent surfaces on one page, matching the plan's locked-in
 * decision: reviews get a moderation queue (pending -> approved/rejected,
 * plus a "feature this" toggle for Testimonials); feedback is an inbox an
 * operator reads, no actions.
 */
export default function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState<AdminTabId>("moderation");

  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("pending");
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isActing, setIsActing] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackSubmissionRecord[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    setReviewsError(null);
    try {
      const filters = statusFilter === "all" ? {} : { status: statusFilter };
      const res = await adminListReviews({ ...filters, limit: 100 });
      setReviews(res.reviews);
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setIsLoadingReviews(false);
    }
  }, [statusFilter]);

  const fetchFeedback = useCallback(async () => {
    setIsLoadingFeedback(true);
    setFeedbackError(null);
    try {
      const res = await adminListFeedback();
      setFeedback(res.submissions);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setIsLoadingFeedback(false);
    }
  }, []);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    if (activeTab === "feedback") void fetchFeedback();
  }, [activeTab, fetchFeedback]);

  const handleApprove = async (review: ReviewRecord) => {
    setIsActing(true);
    try {
      await adminApproveReview(review.id);
      setSelectedReview(null);
      await fetchReviews();
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "Failed to approve review");
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async (review: ReviewRecord) => {
    if (!rejectReason.trim()) return;
    setIsActing(true);
    try {
      await adminRejectReview(review.id, rejectReason.trim());
      setSelectedReview(null);
      setRejectReason("");
      await fetchReviews();
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "Failed to reject review");
    } finally {
      setIsActing(false);
    }
  };

  const handleToggleFeatured = async (review: ReviewRecord) => {
    setIsActing(true);
    try {
      await adminSetReviewFeatured(review.id, !review.isFeatured);
      setSelectedReview(null);
      await fetchReviews();
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : "Failed to update featured status");
    } finally {
      setIsActing(false);
    }
  };

  const reviewColumns: Column<ReviewRecord>[] = [
    {
      kind: "property",
      key: "rating",
      header: "Rating",
      render: (row) => <StarRating value={row.rating} readOnly size="sm" />,
    },
    {
      kind: "property",
      key: "body",
      header: "Review",
      render: (row) => (
        <span className="text-[var(--chrome-ink)] line-clamp-2 max-w-md block">{row.body}</span>
      ),
    },
    {
      kind: "property",
      key: "gameId",
      header: "Scope",
      render: (row) => <span className="text-[var(--chrome-ink-soft)]">{scopeLabel(row)}</span>,
    },
    {
      kind: "property",
      key: "identityKind",
      header: "Submitted By",
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-[var(--chrome-control)] text-[var(--chrome-ink)] font-mono text-xs font-bold border border-[var(--chrome-border)]">
          {row.identityKind}
        </span>
      ),
    },
    {
      kind: "property",
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status={reviewStatusVisual(row.status)} label={row.status} size="sm" />
          {row.isFeatured && (
            <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-1.5 rounded inline-flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5" /> Featured
            </span>
          )}
        </span>
      ),
    },
    {
      kind: "property",
      key: "createdAt",
      header: "Submitted",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  const feedbackColumns: Column<FeedbackSubmissionRecord>[] = [
    {
      kind: "property",
      key: "category",
      header: "Category",
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-[var(--chrome-control)] text-[var(--chrome-ink)] font-mono text-xs font-bold border border-[var(--chrome-border)] capitalize">
          {row.category}
        </span>
      ),
    },
    {
      kind: "property",
      key: "message",
      header: "Message",
      render: (row) => <span className="text-[var(--chrome-ink)] line-clamp-2 max-w-lg block">{row.message}</span>,
    },
    {
      kind: "property",
      key: "email",
      header: "Email",
      render: (row) => <span className="text-[var(--chrome-ink-soft)]">{row.email ?? "—"}</span>,
    },
    {
      kind: "property",
      key: "createdAt",
      header: "Submitted",
      align: "right",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--chrome-ink-soft)]">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  const statusFilterOptions: FilterOption[] = [
    {
      id: "status",
      label: "Status",
      value: statusFilter,
      options: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "All", value: "all" },
      ],
      onChange: (v) => setStatusFilter(v as ReviewStatus | "all"),
    },
  ];

  const pendingCount = reviews.filter((r) => r.status === "pending").length;
  const approvedCount = reviews.filter((r) => r.status === "approved").length;
  const featuredCount = reviews.filter((r) => r.isFeatured).length;

  return (
    <AdminLayout onRefresh={() => (activeTab === "moderation" ? fetchReviews() : fetchFeedback())} isRefreshing={activeTab === "moderation" ? isLoadingReviews : isLoadingFeedback}>
      <div className="space-y-6">
        <PageHeader
          title="Reviews & Feedback"
          description="Moderate player-submitted reviews before they go public, and read incoming feedback."
        />

        <div
          role="tablist"
          aria-label="Reviews & Feedback sections"
          className="flex items-center gap-1.5 border-b border-[var(--chrome-border)] pb-1"
        >
          {([
            { id: "moderation" as const, label: "Moderation Queue", icon: MessageSquareText },
            { id: "feedback" as const, label: "Feedback Inbox", icon: Inbox },
          ]).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isActive
                    ? "bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)] shadow-2xs border border-[var(--chrome-active-ink)]"
                    : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "moderation" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <StatCard title="Pending" value={String(pendingCount)} icon={<MessageSquareText className="w-5 h-5 text-amber-500" />} />
              <StatCard title="Approved (this page)" value={String(approvedCount)} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} />
              <StatCard title="Featured" value={String(featuredCount)} icon={<Star className="w-5 h-5 text-amber-500" />} />
            </div>

            {reviewsError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                {reviewsError}
              </div>
            )}

            <FilterBar filters={statusFilterOptions} onReset={() => setStatusFilter("pending")} />

            <DataTable
              columns={reviewColumns}
              data={reviews}
              onRowClick={(row) => setSelectedReview(row)}
              getRowAriaLabel={(row) => `Open details for review ${row.id}`}
              emptyMessage="No reviews found"
              emptyDescription="No reviews match the current filter."
              emptyIcon={<Filter className="w-6 h-6" />}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                {feedbackError}
              </div>
            )}
            <DataTable
              columns={feedbackColumns}
              data={feedback}
              emptyMessage="No feedback yet"
              emptyDescription="Player-submitted feedback will show up here."
              emptyIcon={<Inbox className="w-6 h-6" />}
            />
          </div>
        )}

        <DetailDrawer
          isOpen={Boolean(selectedReview)}
          onClose={() => {
            setSelectedReview(null);
            setRejectReason("");
          }}
          title="Review Details"
          subtitle={selectedReview ? scopeLabel(selectedReview) : undefined}
          badge={
            selectedReview && <StatusBadge status={reviewStatusVisual(selectedReview.status)} label={selectedReview.status} size="sm" />
          }
          footer={
            selectedReview &&
            (selectedReview.status === "pending" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isActing}
                  onClick={() => handleApprove(selectedReview)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  disabled={isActing || !rejectReason.trim()}
                  onClick={() => handleReject(selectedReview)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            ) : selectedReview.status === "approved" ? (
              <button
                type="button"
                disabled={isActing}
                onClick={() => handleToggleFeatured(selectedReview)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="w-4 h-4" />
                <span>{selectedReview.isFeatured ? "Remove from Testimonials" : "Feature in Testimonials"}</span>
              </button>
            ) : null)
          }
        >
          {selectedReview && (
            <div className="space-y-6">
              <StarRating value={selectedReview.rating} readOnly size="lg" />
              <p className="text-sm text-[var(--chrome-ink)] leading-relaxed whitespace-pre-wrap">{selectedReview.body}</p>

              <InfoCard
                title="Submission Details"
                fields={[
                  { label: "Identity", value: `${selectedReview.identityKind} (${selectedReview.identityId})`, isMono: true },
                  { label: "Scope", value: scopeLabel(selectedReview) },
                  { label: "Submitted", value: new Date(selectedReview.createdAt).toLocaleString() },
                  ...(selectedReview.moderatedAt
                    ? [{ label: "Moderated", value: new Date(selectedReview.moderatedAt).toLocaleString() }]
                    : []),
                  ...(selectedReview.rejectionReason
                    ? [{ label: "Rejection Reason", value: selectedReview.rejectionReason }]
                    : []),
                ]}
              />

              {selectedReview.status === "pending" && (
                <div className="space-y-1.5">
                  <label htmlFor="reject-reason" className="text-xs font-bold text-[var(--chrome-ink)]">
                    Rejection reason (required to reject)
                  </label>
                  <textarea
                    id="reject-reason"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Spam, offensive language, not a genuine review"
                    className="w-full bg-[var(--chrome-control)] border border-[var(--chrome-border)] rounded-xl p-3 text-xs text-[var(--chrome-ink)] placeholder-[var(--chrome-ink-soft)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>
          )}
        </DetailDrawer>
      </div>
    </AdminLayout>
  );
}
