import { apiFetch, clearStoredSession } from "./api";

export async function clearSession(): Promise<void> {
  try {
    await apiFetch("/auth/sign-out", undefined, { method: "POST" });
  } catch {
    // Treat as signed out on the client side regardless of network errors.
  } finally {
    clearStoredSession();
  }
}
