import type { AvailabilityState } from "./types";

type AvailabilityMessageProps = {
  state: AvailabilityState;
  field: "username" | "email";
  idleMessage?: string;
};

export function AvailabilityMessage({
  state,
  field,
  idleMessage,
}: AvailabilityMessageProps) {
  if (state === "idle" && !idleMessage) return null;

  const label = field === "username" ? "Username" : "Email";
  const message =
    state === "checking"
      ? `Checking ${field}…`
      : state === "available"
        ? `${label} is available`
        : state === "taken"
          ? `${label} is already in use`
          : idleMessage;

  return <small className={`availability-status ${state}`}>{message}</small>;
}
