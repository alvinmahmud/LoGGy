import { Logo } from "./Logo";

export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Logo />
      <p>Loading your profile…</p>
    </div>
  );
}
