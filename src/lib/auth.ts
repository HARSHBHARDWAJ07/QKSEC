import { apiFetch } from "./api";

export type SessionResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
};

export async function clearSession(): Promise<void> {
  try {
    await apiFetch("/auth/sign-out", undefined, { method: "POST" });
  } catch {
    // Session cookies are still cleared by the server even on network error;
    // treat as signed out on the client side regardless.
  }
}

export async function refreshSession() {
  try {
    await apiFetch("/auth/refresh", undefined, {
      method: "POST",
    });
    return true;
  } catch {
    clearSession();
    return false;
  }
}