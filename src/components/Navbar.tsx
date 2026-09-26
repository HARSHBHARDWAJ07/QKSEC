"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type AnnouncementRecord } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { SearchIcon } from "./Icons";

// Pages reachable from the navbar's quick search.
const PAGES = [
  ["Home", "/"], ["Teachers", "/list/teachers"], ["Students", "/list/students"], ["Parents", "/list/parents"],
  ["Subjects", "/list/subjects"], ["Classes", "/list/classes"], ["Lessons", "/list/lessons"], ["Exams", "/list/exams"],
  ["Assignments", "/list/assignments"], ["Results", "/list/results"], ["Attendance", "/list/attendance"],
  ["Events", "/list/events"], ["Announcements", "/list/announcements"], ["Profile", "/profile"], ["Settings", "/settings"],
] as const;

const Navbar = () => {
  const router = useRouter();
  const { user, loading, unauthenticated } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [activeAnnouncements, setActiveAnnouncements] = useState(0);

  // Every dashboard page needs a session; send signed-out visitors to sign in.
  useEffect(() => {
    if (unauthenticated) router.replace("/sign-in");
  }, [unauthenticated, router]);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    apiFetch<{ data: AnnouncementRecord[] }>("/announcements?pageSize=100")
      .then((response) => setActiveAnnouncements(response.data.filter((a) =>
        a.published_at && new Date(a.published_at).getTime() <= now && (!a.expires_at || new Date(a.expires_at).getTime() > now),
      ).length))
      .catch(() => undefined);
  }, [user]);

  async function handleSignOut() {
    await clearSession();
    router.push("/sign-in");
  }

  function goToPage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim().toLowerCase();
    const match = PAGES.find(([label]) => label.toLowerCase().startsWith(q)) ?? PAGES.find(([label]) => label.toLowerCase().includes(q));
    if (q && match) {
      router.push(match[1]);
      setQuery("");
    }
  }

  const displayName = loading ? "…" : user ? `${user.firstName} ${user.lastName}` : "Not signed in";
  const displayRole = user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "";

  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <form onSubmit={goToPage} className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-3 focus-within:ring-lamaPurple" role="search">
        <SearchIcon className="w-4 h-4 text-gray-400" />
        <input
          type="search"
          list="navbar-pages"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Go to page…"
          aria-label="Go to page"
          className="w-[200px] p-2 bg-transparent outline-none"
        />
        <datalist id="navbar-pages">
          {PAGES.map(([label]) => <option key={label} value={label} />)}
        </datalist>
      </form>

      <div className="flex items-center gap-5 justify-end w-full">
        <Link
          href="/list/announcements"
          title="Announcements"
          aria-label={`Announcements (${activeAnnouncements} active)`}
          className="bg-white rounded-full w-9 h-9 flex items-center justify-center relative hover:shadow"
        >
          <Image src="/announcement.png" alt="" width={20} height={20} />
          {activeAnnouncements > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center bg-lamaPurple text-white rounded-full text-[10px]">
              {activeAnnouncements}
            </span>
          )}
        </Link>
        <Link href="/profile" className="flex items-center gap-3 hover:opacity-80" title="Your profile">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium leading-4">{displayName}</span>
            <span className="text-[11px] text-gray-500">{displayRole}</span>
          </div>
          <Image src="/avatar.png" alt="" width={36} height={36} className="rounded-full" />
        </Link>
        <button type="button" onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-900 whitespace-nowrap">
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Navbar;
