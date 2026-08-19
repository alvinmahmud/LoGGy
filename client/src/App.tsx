import { useEffect, useState } from "react";
import { ApiError, authApi, type User } from "./services/api";
import { LoadingScreen } from "./components/LoadingScreen";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { useTheme } from "./hooks/useTheme";
import type { Notice } from "./types/ui";
import "./styles/app.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    authApi
      .session()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) {
          setSessionError(
            "The API is not reachable yet. Start the server and try again.",
          );
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <LoginPage
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
    <DashboardPage
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

export default App;
