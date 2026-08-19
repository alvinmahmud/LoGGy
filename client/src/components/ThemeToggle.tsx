import { Moon, Sun } from "lucide-react";
import type { Theme } from "../types/ui";

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
  menuItem?: boolean;
  className?: string;
};

export function ThemeToggle({
  theme,
  onToggle,
  menuItem = false,
  className = "",
}: ThemeToggleProps) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      role={menuItem ? "menuitem" : undefined}
      className={`${menuItem ? "theme-menu-item" : "theme-toggle"} ${className}`.trim()}
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
      {menuItem && (
        <span>{nextTheme === "light" ? "Light mode" : "Dark mode"}</span>
      )}
    </button>
  );
}
