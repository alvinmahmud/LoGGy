import {
  type FormEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { authApi, type User } from "../../services/api";
import { Banner } from "../../components/Banner";
import { ThemeToggle } from "../../components/ThemeToggle";
import type { Theme } from "../../types/ui";
import { AvailabilityMessage } from "./AvailabilityMessage";
import { GoogleSignInButton } from "./GoogleSignInButton";
import type { AuthAction, AuthMode, AvailabilityState } from "./types";
import { emailPattern, usernamePattern } from "./validation";

type LoginPageProps = {
  initialError: string;
  theme: Theme;
  onToggleTheme: () => void;
  onAuthenticated: (user: User, action: AuthAction) => void;
};

export function LoginPage({
  initialError,
  theme,
  onToggleTheme,
  onAuthenticated,
}: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const [error, setError] = useState(initialError);
  const [usernameAvailability, setUsernameAvailability] =
    useState<AvailabilityState>("idle");
  const [emailAvailability, setEmailAvailability] =
    useState<AvailabilityState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [formHeight, setFormHeight] = useState(430);

  useLayoutEffect(() => {
    if (formRef.current) setFormHeight(formRef.current.scrollHeight);
  }, [mode, usernameAvailability, emailAvailability]);

  async function checkUsernameAvailability() {
    const normalizedUsername = username.trim();
    if (!usernamePattern.test(normalizedUsername)) {
      setUsernameAvailability("idle");
      return;
    }

    setUsernameAvailability("checking");
    try {
      const result = await authApi.availability({
        username: normalizedUsername,
      });
      setUsernameAvailability(result.usernameAvailable ? "available" : "taken");
    } catch {
      setUsernameAvailability("idle");
    }
  }

  async function checkEmailAvailability() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setEmailAvailability("idle");
      return;
    }

    setEmailAvailability("checking");
    try {
      const result = await authApi.availability({ email: normalizedEmail });
      setEmailAvailability(result.emailAvailable ? "available" : "taken");
    } catch {
      setEmailAvailability("idle");
    }
  }

  async function submitCredentials(event: FormEvent) {
    event.preventDefault();
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "register" && !usernamePattern.test(normalizedUsername)) {
      setError(
        "Username must be 3–24 characters using letters, numbers, or underscores.",
      );

      return;
    }
    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address.");

      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");

      return;
    }
    if (password.length > 128) {
      setError("Password must be no more than 128 characters.");

      return;
    }
    if (mode === "register" && password !== passwordConfirmation) {
      setError("Passwords do not match.");

      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (mode === "register") {
        setUsernameAvailability("checking");
        setEmailAvailability("checking");

        const availability = await authApi.availability({
          username: normalizedUsername,
          email: normalizedEmail,
        });

        setUsernameAvailability(
          availability.usernameAvailable ? "available" : "taken",
        );
        setEmailAvailability(
          availability.emailAvailable ? "available" : "taken",
        );

        if (!availability.usernameAvailable || !availability.emailAvailable) {
          setError(
            !availability.usernameAvailable && !availability.emailAvailable
              ? "That username and email are already in use."
              : !availability.usernameAvailable
                ? "That username is already taken."
                : "An account with that email already exists.",
          );

          return;
        }
      }

      const response =
        mode === "register"
          ? await authApi.register(
              normalizedUsername,
              normalizedEmail,
              password,
            )
          : await authApi.login(normalizedEmail, password);
      onAuthenticated(response.user, mode);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : mode === "register"
            ? "Could not create your account"
            : "Could not sign in",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const googleSignIn = useCallback(
    async (credential: string) => {
      setError("");
      try {
        const response = await authApi.google(credential);
        onAuthenticated(response.user, "google");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Google sign-in could not be completed",
        );
      }
    },
    [onAuthenticated],
  );

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
  };

  return (
    <main className="auth-page">
      <ThemeToggle
        theme={theme}
        onToggle={onToggleTheme}
        className="auth-theme-toggle"
      />
      <section className="auth-story">
        <a
          className="brand auth-brand"
          href="/"
          aria-label="Media Backlog home"
        >
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <span>Media Backlog</span>
        </a>
        <div>
          <p className="eyebrow">Your media list</p>
          <h1>Keep a backlog.</h1>
          <p>Track games, films, series, and books in one place.</p>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="sign-in-title">
        <div className="auth-card">
          <p className="section-kicker">Account</p>
          <h2 id="sign-in-title">
            {mode === "register" ? "Create your profile" : "Welcome back"}
          </h2>
          <p className="auth-intro">
            {mode === "register"
              ? "Create an account to save your backlog."
              : "Sign in to view your backlog."}
          </p>

          <GoogleSignInButton onCredential={googleSignIn} />
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          <div className="account-mode-tabs" aria-label="Account action">
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => changeMode("register")}
              type="button"
            >
              Create account
            </button>
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
              type="button"
            >
              Sign in
            </button>
          </div>

          <div className="account-form-shell" style={{ height: formHeight }}>
            <form
              key={mode}
              ref={formRef}
              onSubmit={submitCredentials}
              className="account-form"
              noValidate
            >
              {mode === "register" && (
                <label className="field">
                  <span>Username</span>
                  <input
                    required
                    minLength={3}
                    maxLength={24}
                    pattern="[A-Za-z0-9_]+"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      setUsernameAvailability("idle");
                    }}
                    onBlur={checkUsernameAvailability}
                    placeholder="Enter a username"
                  />
                  <AvailabilityMessage
                    state={usernameAvailability}
                    field="username"
                    idleMessage="3–24 letters, numbers, or underscores"
                  />
                </label>
              )}
              <label className="field">
                <span>Email</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailAvailability("idle");
                  }}
                  onBlur={
                    mode === "register" ? checkEmailAvailability : undefined
                  }
                  placeholder="Enter your email address"
                />
                {mode === "register" && (
                  <AvailabilityMessage
                    state={emailAvailability}
                    field="email"
                  />
                )}
              </label>
              <PasswordField
                label="Password"
                value={password}
                visible={showPassword}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                placeholder={
                  mode === "register"
                    ? "Create a password"
                    : "Enter your password"
                }
                helperText={
                  mode === "register" ? "Use at least 10 characters" : undefined
                }
                onChange={setPassword}
                onToggle={() => setShowPassword((visible) => !visible)}
              />
              {mode === "register" && (
                <PasswordField
                  label="Confirm password"
                  value={passwordConfirmation}
                  visible={showPasswordConfirmation}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  onChange={setPasswordConfirmation}
                  onToggle={() =>
                    setShowPasswordConfirmation((visible) => !visible)
                  }
                />
              )}
              {error && (
                <Banner
                  tone="error"
                  title={
                    mode === "register"
                      ? "Couldn’t create account"
                      : "Couldn’t sign in"
                  }
                  message={error}
                  onDismiss={() => setError("")}
                />
              )}
              <button className="add-button auth-submit" disabled={submitting}>
                {submitting
                  ? mode === "register"
                    ? "Creating account…"
                    : "Signing in…"
                  : mode === "register"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  visible: boolean;
  autoComplete: string;
  placeholder: string;
  helperText?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
};

function PasswordField({
  label,
  value,
  visible,
  autoComplete,
  placeholder,
  helperText,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-field">
        <input
          required
          type={visible ? "text" : "password"}
          minLength={10}
          maxLength={128}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onToggle}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff size={20} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye size={20} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      </div>
      {helperText && <small>{helperText}</small>}
    </label>
  );
}
