import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createPortal } from "react-dom";
import "./Banner.css";

export type BannerTone = "success" | "error";

export function Banner({
  tone,
  title,
  message,
  onDismiss,
}: {
  tone: BannerTone;
  title: string;
  message: string;
  onDismiss?: () => void;
}) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;

  return createPortal(
    <div
      key={`${tone}:${title}:${message}`}
      className={`banner banner-${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <Icon
        className="banner-icon"
        size={20}
        strokeWidth={1.9}
        aria-hidden="true"
      />
      <div className="banner-copy">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          className="banner-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>,
    document.body,
  );
}
