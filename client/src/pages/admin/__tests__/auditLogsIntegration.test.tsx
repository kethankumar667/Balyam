import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminAuditLogsPage from "../audit-logs";

/**
 * Audit Logs, wired to the real merged feed.
 *
 * `GET /api/admin/audit` merges settlement_events with ADMIN_ADJUSTMENT
 * ledger rows server-side; these tests assert the page renders exactly
 * what came back — not the old `MOCK_AUDIT_LOGS` array, and never a
 * fabricated actor name, role, or IP address.
 *
 * No `@testing-library/jest-dom` matchers (not registered in this suite).
 */

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

function jsonResponse(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function settlementEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "settlement-1",
    timestamp: Date.now() - 60_000,
    kind: "SETTLEMENT",
    actionCode: "MATCH_SETTLED",
    initiatorKind: "system",
    initiatorId: "usr_host_123",
    resourceId: "match_abc123",
    detail: "settle_match_economy: COMMITTED → SETTLED",
    payload: { previousStatus: "COMMITTED", currentStatus: "SETTLED" },
    ...overrides,
  };
}

function adjustmentEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "ledger-1",
    timestamp: Date.now() - 30_000,
    kind: "WALLET_ADJUSTMENT",
    actionCode: "ADMIN_ADJUSTMENT",
    initiatorKind: "admin",
    initiatorId: "admin-operator-42",
    resourceId: "guest_abc123",
    detail: "Compensating a support ticket",
    payload: { amount: "500" },
    ...overrides,
  };
}

function stubFetch(entries: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/audit")) return jsonResponse(200, { entries });
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal("sessionStorage", {
    getItem: () => "test-ops-key",
    setItem: () => undefined,
    removeItem: () => undefined,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin Audit Logs — real merged settlement/adjustment feed", () => {
  it("renders both a settlement event and a wallet adjustment returned by the server", async () => {
    stubFetch([settlementEntry(), adjustmentEntry()]);
    renderRoute(<AdminAuditLogsPage />);

    await waitFor(() => expect(screen.getByText("MATCH_SETTLED")).toBeDefined());
    expect(screen.getByText("ADMIN_ADJUSTMENT")).toBeDefined();
    expect(screen.getByText("admin-operator-42")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined(); // Events Loaded StatCard
  });

  it("never renders a fabricated actor name, role, or IP address", async () => {
    stubFetch([settlementEntry(), adjustmentEntry()]);
    const { container } = renderRoute(<AdminAuditLogsPage />);
    await waitFor(() => expect(screen.getByText("MATCH_SETTLED")).toBeDefined());

    expect(container.textContent).not.toMatch(/SuperAdmin|Moderator|AutomatedBot|192\.168\.\d+\.\d+/);
  });

  it("filters by type using the server-shaped kind rather than a fabricated severity", async () => {
    stubFetch([settlementEntry(), adjustmentEntry()]);
    renderRoute(<AdminAuditLogsPage />);
    await waitFor(() => expect(screen.getByText("MATCH_SETTLED")).toBeDefined());

    fireEvent.change(screen.getByLabelText(/filter by type/i), { target: { value: "WALLET_ADJUSTMENT" } });

    await waitFor(() => {
      expect(screen.queryByText("MATCH_SETTLED")).toBeNull();
      expect(screen.getByText("ADMIN_ADJUSTMENT")).toBeDefined();
    });
  });

  it("opening a row shows the real raw JSON payload, not an invented one", async () => {
    stubFetch([adjustmentEntry()]);
    renderRoute(<AdminAuditLogsPage />);
    await waitFor(() => expect(screen.getByText("ADMIN_ADJUSTMENT")).toBeDefined());

    fireEvent.click(screen.getByText("ADMIN_ADJUSTMENT"));

    // Appears twice by design: once (truncated) in the table row, once in the drawer's Detail section.
    await waitFor(() => expect(screen.getAllByText(/Compensating a support ticket/i).length).toBeGreaterThan(1));
    expect(screen.getByText(/"amount": "500"/)).toBeDefined();
  });

  it("renders an honest empty state when the server has no audit events", async () => {
    stubFetch([]);
    renderRoute(<AdminAuditLogsPage />);

    await waitFor(() => expect(screen.getByText(/no audit events recorded yet/i)).toBeDefined());
  });

  it("surfaces a failure honestly rather than falling back to sample events", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("audit service down")));
    renderRoute(<AdminAuditLogsPage />);

    await waitFor(() => expect(screen.getAllByText(/audit data unavailable/i).length).toBeGreaterThan(0));
    expect(screen.queryByText("MATCH_SETTLED")).toBeNull();
  });
});
