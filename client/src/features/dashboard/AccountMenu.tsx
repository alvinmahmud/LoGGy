import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import type { User } from "../../services/api";
import { ThemeToggle } from "../../components/ThemeToggle";
import type { Theme } from "../../types/ui";

type AccountMenuProps = {
  user: User;
  theme: Theme;
  onToggleTheme: () => void;
  onSignOut: () => Promise<void>;
};

export function AccountMenu({
  user,
  theme,
  onToggleTheme,
  onSignOut,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    await onSignOut();
  };

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.picture ? (
          <img src={user.picture} alt="" />
        ) : (
          <span className="account-initial" aria-hidden="true">
            {user.username.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="account-name">{user.username}</span>
        <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {open && (
        <div className="account-dropdown" role="menu">
          <button type="button" role="menuitem" disabled>
            <Settings size={16} strokeWidth={1.8} aria-hidden="true" />
            Account settings
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} menuItem />
          <button type="button" role="menuitem" onClick={signOut}>
            <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
