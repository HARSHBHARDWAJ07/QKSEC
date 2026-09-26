

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, AnnouncementRecord } from "@/lib/api";

 const Announcements = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);

  useEffect(() => {
    apiFetch<{ data: AnnouncementRecord[] }>("/announcements")
      .then((response) => setAnnouncements(response.data.filter((a) => a.published_at).slice(0, 3)))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const [loaded, setLoaded] = useState(false);
  const displayedAnnouncements = announcements;

  return (
    <div className="bg-white p-4 rounded-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Announcements</h1>
          <Link href="/list/announcements" className="text-xs text-gray-500 hover:underline">View all</Link>
        </div>
        <div className="flex flex-col gap-4 mt-4">
          {loaded && displayedAnnouncements.length === 0 && <p className="text-sm text-gray-400">No announcements yet.</p>}
          {displayedAnnouncements.map((announcement, index) => (
            <div className={`${index % 3 === 0 ? "bg-lamaSkyLight" : index % 3 === 1 ? "bg-lamaPurpleLight" : "bg-lamaYellowLight"} rounded-md p-4`} key={announcement.id}>
                <div className="flex items-center justify-between">
                <h2 className="font-medium">
                  {announcement.title}
                </h2>
                <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                  {announcement.published_at ? new Date(announcement.published_at).toLocaleDateString() : "Draft"}
                 </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-3">
                  {announcement.body}
                </p>
            </div>
          ))}
        </div>
    </div>
  )
}

export default Announcements
