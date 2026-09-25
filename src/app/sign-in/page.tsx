"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, storeSession, type SessionTokens } from "@/lib/api";

type SignInResponse = {
  user: unknown;
  session?: SessionTokens;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await apiFetch<SignInResponse>("/auth/sign-in", undefined, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      storeSession(response.session);
      router.push("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-md shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sign in to QKSEC</h1>
          <p className="text-sm text-gray-500 mt-2">Use your school account to continue.</p>
        </div>
        <label className="block text-sm font-medium text-gray-700">
          Email
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Password
          <input
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-lamaSky px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}