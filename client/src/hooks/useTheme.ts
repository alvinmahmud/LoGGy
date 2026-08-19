import { useLayoutEffect, useState } from "react";
import type { Theme } from "../types/ui";

const THEME_STORAGE_KEY = "media-backlog-theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem(THEME_STORAGE_KEY) === "light"
      ? "light"
      : "dark",
  );

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    toggleTheme: () =>
      setTheme((current) => (current === "dark" ? "light" : "dark")),
  };
}
