import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import {
  ApiError,
  authApi,
  mediaApi,
  type ApiMediaItem,
  type User,
} from "./api";
import { Banner, type BannerTone } from "./components/Banner";
import "./App.css";

type MediaType = ApiMediaItem["type"];
type Status = ApiMediaItem["status"];
type NewMediaItem = Omit<ApiMediaItem, "_id" | "createdAt">;
type AuthAction = "register" | "login" | "google";
type AvailabilityState = "idle" | "checking" | "available" | "taken";
type Notice = { tone: BannerTone; title: string; message: string };
type Theme = "dark" | "light";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[A-Za-z0-9_]{3,24}$/;

const typeLabels: Record<MediaType, string> = {
  movie: "Film",
  tv: "Series",
  book: "Book",
  game: "Game",
};
const typeMarks: Record<MediaType, string> = {
  movie: "●",
  tv: "▰",
  book: "▥",
  game: "✦",
};
const statusLabels: Record<Status, string> = {
  backlog: "Backlog",
  "in progress": "In progress",
  completed: "Completed",
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem("media-backlog-theme") === "light"
      ? "light"
      : "dark",
  );

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("media-backlog-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((current) => (current === "dark" ? "light" : "dark"));

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 5500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    authApi
      .session()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) {
          setSessionError(
            "The API is not reachable yet. Start the backend and try again.",
          );
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return <LoadingScreen />;
  if (!user) {
    return (
      <SignInScreen
        initialError={sessionError}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={(authenticatedUser, action) => {
          setSessionError("");
          setNotice({
            tone: "success",
            title: action === "register" ? "Account created" : "Signed in",
            message:
              action === "register"
                ? `Account created for ${authenticatedUser.username}.`
                : `Signed in as ${authenticatedUser.username}.`,
          });
          setUser(authenticatedUser);
        }}
      />
    );
  }

  return (
    <Library
      user={user}
      notice={notice}
      theme={theme}
      onToggleTheme={toggleTheme}
      onDismissNotice={() => setNotice(null)}
      onSignedOut={() => {
        setNotice(null);
        setUser(null);
      }}
    />
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <span className="brand-mark">M</span>
      <p>Loading your profile…</p>
    </div>
  );
}

function SignInScreen({
  initialError,
  theme,
  onToggleTheme,
  onAuthenticated,
}: {
  initialError: string;
  theme: Theme;
  onToggleTheme: () => void;
  onAuthenticated: (user: User, action: AuthAction) => void;
}) {
  const [mode, setMode] = useState<"register" | "login">("register");
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

          <GoogleButton onCredential={googleSignIn} />
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          <div className="account-mode-tabs" aria-label="Account action">
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
              }}
              type="button"
            >
              Create account
            </button>
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
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
              className={`account-form ${mode}`}
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
              <label className="field">
                <span>Password</span>
                <div className="password-field">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={10}
                    maxLength={128}
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      mode === "register"
                        ? "Create a password"
                        : "Enter your password"
                    }
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff size={20} strokeWidth={1.8} aria-hidden="true" />
                    ) : (
                      <Eye size={20} strokeWidth={1.8} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {mode === "register" && (
                  <small>Use at least 10 characters</small>
                )}
              </label>
              {mode === "register" && (
                <label className="field">
                  <span>Confirm password</span>
                  <div className="password-field">
                    <input
                      required
                      type={showPasswordConfirmation ? "text" : "password"}
                      minLength={10}
                      maxLength={128}
                      autoComplete="new-password"
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPasswordConfirmation((visible) => !visible)
                      }
                      aria-label={
                        showPasswordConfirmation
                          ? "Hide confirmed password"
                          : "Show confirmed password"
                      }
                      aria-pressed={showPasswordConfirmation}
                    >
                      {showPasswordConfirmation ? (
                        <EyeOff
                          size={20}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      ) : (
                        <Eye size={20} strokeWidth={1.8} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </label>
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

function AvailabilityMessage({
  state,
  field,
  idleMessage,
}: {
  state: AvailabilityState;
  field: "username" | "email";
  idleMessage?: string;
}) {
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

function GoogleButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;
    const render = () => {
      if (!window.google || !buttonRef.current) return;

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

    const existing = document.getElementById(
      "google-identity-script",
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", render);
      render();

      return () => existing.removeEventListener("load", render);
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

function Library({
  user,
  notice,
  theme,
  onToggleTheme,
  onDismissNotice,
  onSignedOut,
}: {
  user: User;
  notice: Notice | null;
  theme: Theme;
  onToggleTheme: () => void;
  onDismissNotice: () => void;
  onSignedOut: () => void;
}) {
  const [items, setItems] = useState<ApiMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [isAdding, setIsAdding] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mediaApi
      .list()
      .then((loadedItems) => {
        setItems(loadedItems);
        setError("");
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load your backlog",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountMenuOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items
      .filter((item) => typeFilter === "all" || item.type === typeFilter)
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter(
        (item) =>
          !query ||
          item.title.toLowerCase().includes(query) ||
          (item.notes || "").toLowerCase().includes(query),
      );
  }, [items, search, typeFilter, statusFilter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      backlog: items.filter((item) => item.status === "backlog").length,
      "in progress": items.filter((item) => item.status === "in progress")
        .length,
      completed: items.filter((item) => item.status === "completed").length,
    }),
    [items],
  );

  async function addItem(item: NewMediaItem) {
    try {
      const created = await mediaApi.create(item);
      setItems((current) => [created, ...current]);
      setIsAdding(false);
      setError("");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not save this item";
      setError(message);
      throw caught;
    }
  }

  async function updateStatus(id: string, status: Status) {
    try {
      const updated = await mediaApi.update(id, { status });
      setItems((current) =>
        current.map((item) => (item._id === id ? updated : item)),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update the item",
      );
    }
  }

  async function removeItem(id: string) {
    try {
      await mediaApi.remove(id);
      setItems((current) => current.filter((item) => item._id !== id));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not remove the item",
      );
    }
  }

  async function signOut() {
    setAccountMenuOpen(false);
    try {
      await authApi.logout();
    } finally {
      onSignedOut();
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Media Backlog home">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <span>Media Backlog</span>
        </a>
        <div className="topbar-actions">
          <div className="account-menu" ref={accountMenuRef}>
            <button
              type="button"
              className="account-trigger"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
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
            {accountMenuOpen && (
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
          <button
            className="add-button compact"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={17} strokeWidth={2} aria-hidden="true" /> Queue title
          </button>
        </div>
      </header>

      <main id="top">
        {notice && !loading && !error && (
          <Banner
            tone={notice.tone}
            title={notice.title}
            message={notice.message}
            onDismiss={onDismissNotice}
          />
        )}
        <section className="library" aria-labelledby="library-title">
          <div className="section-heading">
            <div>
              <h2 id="library-title">Backlog</h2>
            </div>
            <label className="search-field">
              <Search size={19} strokeWidth={1.8} aria-hidden="true" />
              <span className="sr-only">Search your backlog</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search titles or notes"
              />
            </label>
          </div>
          {error && (
            <Banner
              tone="error"
              title="Something went wrong"
              message={error}
              onDismiss={() => setError("")}
            />
          )}
          <div className="filter-row">
            <div className="status-tabs" aria-label="Filter by status">
              {(["all", "backlog", "in progress", "completed"] as const).map(
                (status) => (
                  <button
                    className={statusFilter === status ? "active" : ""}
                    onClick={() => setStatusFilter(status)}
                    key={status}
                  >
                    {status === "all" ? "All" : statusLabels[status]}
                    <span>{counts[status]}</span>
                  </button>
                ),
              )}
            </div>
            <label className="type-filter">
              <span className="sr-only">Filter by media type</span>
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as MediaType | "all")
                }
              >
                <option value="all">All media</option>
                <option value="movie">Films</option>
                <option value="tv">Series</option>
                <option value="book">Books</option>
                <option value="game">Games</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="library-loading">Loading your backlog…</div>
          ) : filteredItems.length ? (
            <div className="media-grid">
              {filteredItems.map((item, index) => (
                <article
                  className={`media-card tone-${item.type}`}
                  key={item._id}
                  style={{ "--delay": `${index * 45}ms` } as CSSProperties}
                >
                  <div className="card-visual" aria-hidden="true">
                    <span className="media-mark">{typeMarks[item.type]}</span>
                    <span className="media-initial">
                      {item.title.charAt(0).toUpperCase()}
                    </span>
                    <span className="visual-type">{typeLabels[item.type]}</span>
                  </div>
                  <div className="card-content">
                    <div className="card-meta">
                      <span>{typeLabels[item.type]}</span>
                      {item.year && <span>{item.year}</span>}
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.notes || "No notes"}</p>
                    <div className="card-actions">
                      <label>
                        <span className="sr-only">Status for {item.title}</span>
                        <select
                          className={`status-select status-${item.status.replace(" ", "-")}`}
                          value={item.status}
                          onChange={(event) =>
                            updateStatus(item._id, event.target.value as Status)
                          }
                        >
                          <option value="backlog">Backlog</option>
                          <option value="in progress">In progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </label>
                      <button
                        className="remove-button"
                        onClick={() => removeItem(item._id)}
                        aria-label={`Remove ${item.title}`}
                        title="Remove item"
                      >
                        <X size={17} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">◎</span>
              <h3>{items.length ? "No results" : "No items yet"}</h3>
              <button className="text-button" onClick={() => setIsAdding(true)}>
                Add a title
              </button>
            </div>
          )}
        </section>
      </main>
      <footer>
        <span>Media Backlog</span>
        <p>Signed in as {user.email}</p>
      </footer>
      {isAdding && (
        <AddMediaDialog onAdd={addItem} onClose={() => setIsAdding(false)} />
      )}
    </div>
  );
}

function AddMediaDialog({
  onAdd,
  onClose,
}: {
  onAdd: (item: NewMediaItem) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MediaType>("movie");
  const [status, setStatus] = useState<Status>("backlog");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    try {
      await onAdd({
        title: title.trim(),
        type,
        status,
        year: year.trim(),
        notes: notes.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={21} aria-hidden="true" />
        </button>
        <p className="section-kicker">Add to queue</p>
        <h2 id="dialog-title">Add a title</h2>
        <form onSubmit={submit}>
          <label className="field">
            <span>Title</span>
            <input
              autoFocus
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Cyberpunk 2077"
            />
          </label>
          <div className="field-pair">
            <label className="field">
              <span>Media type</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as MediaType)}
              >
                <option value="movie">Film</option>
                <option value="tv">Series</option>
                <option value="book">Book</option>
                <option value="game">Game</option>
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as Status)}
              >
                <option value="backlog">Backlog</option>
                <option value="in progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>
              Release year <em>optional</em>
            </span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={year}
              onChange={(event) =>
                setYear(event.target.value.replace(/\D/g, ""))
              }
              placeholder="2024"
            />
          </label>
          <label className="field">
            <span>
              Note <em>optional</em>
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a note"
              rows={3}
            />
          </label>
          <div className="dialog-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="add-button" disabled={saving}>
              {saving ? "Saving…" : "Add to queue"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ThemeToggle({
  theme,
  onToggle,
  menuItem = false,
  className = "",
}: {
  theme: Theme;
  onToggle: () => void;
  menuItem?: boolean;
  className?: string;
}) {
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

export default App;
