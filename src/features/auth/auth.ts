export interface LoginCredentials {
  serverUrl: string;
  username: string;
  password: string;
  personalAccessToken: string;
}

export interface LoginResult {
  success: boolean;
  username?: string;
  error?: string;
}

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResult> {
  const {
    username,
    password,
    personalAccessToken,
  } = credentials;

  // Temporary mock username/password authentication.
  if (username === "test" && password === "test") {
    return {
      success: true,
      username,
    };
  }

  // Temporary mock PAT authentication.
  if (personalAccessToken === "test-token") {
    return {
      success: true,
    };
  }

  return {
    success: false,
    error: "Invalid username/password or personal access token.",
  };

  /*
  Future Tauri/Python implementation:

  import { invoke } from "@tauri-apps/api/core";

  return invoke<LoginResult>("login", {
    serverUrl: credentials.serverUrl,
    username: credentials.username,
    password: credentials.password,
    personalAccessToken: credentials.personalAccessToken,
  });
  */
}