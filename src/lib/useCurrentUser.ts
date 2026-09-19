"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";

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

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch<MeResponse>("/auth/me")
      .then((data) => {
        if (!active) return;
        setUser({
          id: data.user.id,
          email: data.user.email,
          role: data.profile.role,
          firstName: data.profile.first_name,
          lastName: data.profile.last_name,
        });
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { user, role: user?.role ?? null, loading };
}
