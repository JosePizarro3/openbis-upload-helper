export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResult> {
  const { username, password } = credentials;

  // Temporary mock authentication.
  if (username === "test" && password === "test") {
    return {
      success: true,
    };
  }

  return {
    success: false,
    error: "Invalid username or password.",
  };
}