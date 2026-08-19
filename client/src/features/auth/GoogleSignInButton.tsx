import { useEffect, useRef } from "react";

type GoogleSignInButtonProps = {
  onCredential: (credential: string) => void;
};

export function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !buttonRef.current) {
      return;
    }

    const render = () => {
      if (!window.google || !buttonRef.current) {
        return;
      }

      buttonRef.current.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        width: Math.min(360, buttonRef.current.clientWidth || 360),
      });
    };

    const existingScript = document.getElementById(
      "google-identity-script",
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", render);
      render();

      return () => existingScript.removeEventListener("load", render);
    }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.addEventListener("load", render);
    document.head.appendChild(script);

    return () => script.removeEventListener("load", render);
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <div className="google-pending">
        <img
          className="google-g"
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
        />
        <strong>Sign in with Google</strong>
        <span className="pending-pill">Coming soon</span>
      </div>
    );
  }

  return (
    <div
      className="google-button"
      ref={buttonRef}
      aria-label="Sign in with Google"
    />
  );
}
