import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import "./Banner.css";

export type BannerTone = "success" | "error";

export function Banner({
  tone,
  title,
  message,
  onDismiss,
  duration = 5000,
}: {
  tone: BannerTone;
  title: string;
  message: string;
  onDismiss?: () => void;
  duration?: number;
}) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!dismissRef.current || duration <= 0) return;

    const timeout = window.setTimeout(() => dismissRef.current?.(), duration);

    return () => window.clearTimeout(timeout);
  }, [duration, message, title, tone]);

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
