import { vi } from "vitest";
import { useAuthStore } from "../../../store/authStore";

/** Shared by the Users list and the user detail page tests: one stubbed operational API. */

export function jsonResponse(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

export function user(overrides: Record<string, unknown> = {}) {
  return {
    id: "usr-real-001",
    name: "Kethan Kumar",
    email: "kethan@bhalyam.io",
    role: "super_admin",
    accountKind: "member",
    suspension: { isSuspended: false, reason: null, updatedAt: null, revision: 0 },
    matchesPlayed: 12,
    winRate: "58%",
    rating: 1540,
    joinedAt: Date.now() - 30 * 86_400_000,
    lastActiveAt: Date.now() - 60_000,
    favoriteGame: "Ludo 🎲",
    ...overrides,
  };
}

/** Answers the directory, one identity's details, and the role endpoint from `users`. */
export function stubFetch(users: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/users/role")) return jsonResponse(200, { success: true, role: "admin" });
      const detail = /\/api\/admin\/users\/([^/?]+)$/.exec(url);
      if (detail) {
        const id = decodeURIComponent(detail[1]!);
        const found = (users as { id: string }[]).find((u) => u.id === id);
        if (!found) return jsonResponse(404, { error: "Unknown identity" });
        return jsonResponse(200, { user: found, sections: [], coverage: ["Legacy match associations unavailable"] });
      }
      if (url.includes("/api/admin/users")) {
        const page = Number(new URL(url, "http://localhost").searchParams.get("page") || 1);
        return jsonResponse(200, { users: users.slice((page - 1) * 10, page * 10), total: users.length, page, pageSize: 10 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

/** A super admin operating the console, with a stored operational key. */
export function signInOperator() {
  useAuthStore.setState({ isSuperAdmin: true, userId: "operator", email: "operator@example.com" });
  vi.stubGlobal("sessionStorage", {
    getItem: () => "test-ops-key",
    setItem: () => undefined,
    removeItem: () => undefined,
  });
}
