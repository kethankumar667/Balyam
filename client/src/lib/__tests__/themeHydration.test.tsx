import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { setTheme, useTheme, type AppTheme } from "../useTheme";

function ThemeControl() {
  const [theme, toggle] = useTheme();
  return <button onClick={toggle}>{theme}</button>;
}

describe("saved theme hydration", () => {
  it.each<AppTheme>(["light", "dark"])("restores %s without changing the first render", async (theme) => {
    document.documentElement.setAttribute("data-theme", "light");
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ThemeControl />);
    setTheme(theme);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoveries: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <ThemeControl />, {
          onRecoverableError: (error) => recoveries.push(error),
        });
      });
      expect(container.textContent).toBe(theme);
      expect(recoveries).toEqual([]);
      expect(errors).not.toHaveBeenCalled();
      act(() => container.querySelector("button")?.click());
      expect(container.textContent).toBe(theme === "dark" ? "light" : "dark");
    } finally {
      act(() => root?.unmount());
      errors.mockRestore();
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("bhalyam.theme");
    }
  });
});
