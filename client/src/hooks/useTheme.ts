import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Theme } from "../types/ui";

const THEME_STORAGE_KEY = "loggy-theme";
const LEGACY_THEME_STORAGE_KEY = "media-backlog-theme";
const THEME_TRANSITION_MS = 180;

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    (window.localStorage.getItem(THEME_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY)) === "light"
      ? "light"
      : "dark",
  );
  const transitionTimeout = useRef<number | null>(null);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  }, [theme]);

  useEffect(
    () => () => {
      if (transitionTimeout.current !== null) {
        window.clearTimeout(transitionTimeout.current);
      }
    },
    [],
  );

  function toggleTheme() {
    const updateTheme = () => {
      flushSync(() => {
        setTheme((current) => (current === "dark" ? "light" : "dark"));
      });
    };
    const transitionDocument = document as ViewTransitionDocument;

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(updateTheme);

      return;
    }

    document.documentElement.classList.add("theme-transitioning");
    updateTheme();

    if (transitionTimeout.current !== null) {
      window.clearTimeout(transitionTimeout.current);
    }

    transitionTimeout.current = window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
      transitionTimeout.current = null;
    }, THEME_TRANSITION_MS);
  }

  return {
    theme,
    toggleTheme,
  };
}
