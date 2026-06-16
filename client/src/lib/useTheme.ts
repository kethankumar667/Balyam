import { useEffect, useState } from "react";

export type AppTheme = "light" | "dark";

const STORAGE_KEY = "bhalyam.theme";
const EVENT_NAME = "bhalyam.theme.changed";

function readTheme(): AppTheme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(next: AppTheme): void {
  document.documentElement.setAttribute("data-theme", next);
  window.localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useTheme(): readonly [AppTheme, () => void] {
  const [theme, setLocal] = useState<AppTheme>(readTheme);

  useEffect(() => {
    const sync = () => setLocal(readTheme());
    window.addEventListener(EVENT_NAME, sync);
    return () => window.removeEventListener(EVENT_NAME, sync);
  }, []);

  const toggle = () => setTheme(theme === "light" ? "dark" : "light");
  return [theme, toggle] as const;
}
