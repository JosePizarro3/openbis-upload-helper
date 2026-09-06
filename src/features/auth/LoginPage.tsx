import { useState } from "react";
import type { SyntheticEvent } from "react";

import { login } from "./auth";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [serverUrl, setServerUrl] = useState("https://openbis.example.org");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [personalAccessToken, setPersonalAccessToken] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: SyntheticEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const result = await login({
        serverUrl,
        username,
        password,
        personalAccessToken,
      });

      if (result.success) {
        onLogin();
        return;
      }

      setError(
        result.error ??
          "Invalid username/password or personal access token.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <h1>openBIS Upload Helper</h1>
          <p>Sign in to your openBIS instance to continue.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="server-url">
            openBIS server
          </label>

          <input
            id="server-url"
            type="url"
            value={serverUrl}
            onChange={(event) =>
              setServerUrl(event.currentTarget.value)
            }
            placeholder="https://openbis.example.org"
            autoComplete="url"
            disabled={loading}
          />

          <label htmlFor="username">
            Username
          </label>

          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) =>
              setUsername(event.currentTarget.value)
            }
            autoComplete="username"
            autoFocus
            disabled={loading || Boolean(personalAccessToken)}
          />

          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.currentTarget.value)
            }
            autoComplete="current-password"
            disabled={loading || Boolean(personalAccessToken)}
          />

          <div className="login-separator">
            <span>or</span>
          </div>

          <label htmlFor="personal-access-token">
            Personal Access Token
          </label>

          <input
            id="personal-access-token"
            type="password"
            value={personalAccessToken}
            onChange={(event) =>
              setPersonalAccessToken(event.currentTarget.value)
            }
            autoComplete="off"
            disabled={loading}
          />

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}