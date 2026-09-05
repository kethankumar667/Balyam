import { useState, useEffect, useCallback } from "react";

export type GameSkinTheme = "notebook" | "neon";

export function useGameTheme(gameKey: string, defaultTheme: GameSkinTheme = "notebook") {
  const storageKey = `bhalyam.${gameKey}.skin`;
  const [theme, setThemeState] = useState<GameSkinTheme>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === "notebook" || saved === "neon" ? saved : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved === "notebook" || saved === "neon") {
          setThemeState(saved);
        }
      } catch {}
    };
    const eventName = `bhalyam:${gameKey}:themeChange`;
    window.addEventListener(eventName, handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(eventName, handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [gameKey, storageKey]);

  const setTheme = useCallback(
    (next: GameSkinTheme) => {
      setThemeState(next);
      try {
        localStorage.setItem(storageKey, next);
        window.dispatchEvent(new Event(`bhalyam:${gameKey}:themeChange`));
      } catch {}
    },
    [gameKey, storageKey]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "notebook" ? "neon" : "notebook");
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isNotebook: theme === "notebook",
    isNeon: theme === "neon",
  };
}

export default useGameTheme;
