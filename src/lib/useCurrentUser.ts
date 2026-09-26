"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "./api";

export type AppRole = "admin" | "teacher" | "student" | "parent";

export type CurrentUser = {
  id: string;
  email?: string;
  role: AppRole;
  firstName: string;
  lastName: string;
};

type MeResponse = {
  user: { id: string; email?: string };
  profile: { role: AppRole; first_name: string; last_name: string };
};

type MeResult = { user: CurrentUser | null; unauthenticated: boolean };

// The menu, navbar and page all need the current user; share one request.
let cached: Promise<MeResult> | null = null;

function loadMe(): Promise<MeResult> {
  cached ??= apiFetch<MeResponse>("/auth/me")
    .then((data) => ({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.profile.role,
        firstName: data.profile.first_name,
        lastName: data.profile.last_name,
      },
      unauthenticated: false,
    }))
    .catch((error: unknown) => {
      cached = null; // let the next mount retry
      return { user: null, unauthenticated: error instanceof ApiError && error.status === 401 };
    });
  return cached;
}

// Call on sign-in, sign-out or profile changes.
export function resetCurrentUser() {
  cached = null;
}

export function useCurrentUser() {
  const [state, setState] = useState<MeResult>({ user: null, unauthenticated: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadMe().then((result) => {
      if (!active) return;
      setState(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { user: state.user, role: state.user?.role ?? null, loading, unauthenticated: state.unauthenticated };
}
