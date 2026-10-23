// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { usePasswordUpdate } from "../useAccountAuth";
import { useAuthStore } from "../../../store/authStore";

vi.mock("../../../lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  SESSION_STORAGE_KEY: "bhalyam.session",
  getSupabase: vi.fn(),
  authErrorMessage: vi.fn(),
  isEmailNotConfirmed: vi.fn(),
  redirectTo: vi.fn(),
}));

function Status() {
  return <p>{usePasswordUpdate().status}</p>;
}

describe("password recovery SSR", () => {
  it("starts server auth pending, just like a configured browser session", () => {
    expect(useAuthStore.getInitialState().ready).toBe(false);
  });

  it.each([
    ["/reset-password", "checking"],
    ["/reset-password?error=access_denied", "invalid"],
    ["/reset-password#error=access_denied", "invalid"],
    ["/reset-password#error_code=otp_expired", "invalid"],
  ])("reads recovery errors from router location without window: %s", (url, expected) => {
    expect(renderToString(<StaticRouter location={url}><Status /></StaticRouter>)).toBe(`<p>${expected}</p>`);
  });
});
