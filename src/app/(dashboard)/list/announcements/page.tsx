"use client";

import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Table from "@/components/Table";
import FormModal from "@/components/FormModal";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { PaginationMeta, AnnouncementRecord } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Announcement = {
  id: number | string;
  title: string;
  class: number | string;
  date: string;
};

function mapAnnouncement(record: AnnouncementRecord): Announcement {
  return {
    id: record.id,
    title: record.title,
    class: "All",
    date: record.published_at ? new Date(record.published_at).toLocaleDateString() : "-",
  };
}

const columns = [
  {
    header: "Title",
    accessor: "title",
  },
  {
    header: "Class",
    accessor: "class",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const AnnouncementListPage = () => {
  const { role } = useCurrentUser();
  const [liveAnnouncements, setLiveAnnouncements] = useState<Announcement[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const fetchAnnouncements = useCallback(() => {
    apiFetch<{ data: AnnouncementRecord[]; meta: PaginationMeta }>(`/announcements?page=${page}`)
      .then((response) => {
        setLiveAnnouncements(response.data.map(mapAnnouncement));
        setMeta(response.meta);
      })
      .catch(() => undefined);
  }, [page]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const renderRow = (item: Announcement) => (
    <tr
      key={item.id}
      className="border-b border-lamaSkyLight/30 hover:bg-lamaSkyLight/20 transition-colors duration-150"
    >
      <td className="p-4 text-lamaSky font-medium">{item.title}</td>
      <td className="p-4 text-lamaSky/80">{item.class}</td>
      <td className="p-4 text-lamaSky/60 hidden md:table-cell">{item.date}</td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          {role === "admin" && (
            <>
              <FormModal table="announcement" type="update" data={item} onSuccess={fetchAnnouncements} />
              <FormModal table="announcement" type="delete" id={item.id} onSuccess={fetchAnnouncements} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-lamaSkyLight p-6 rounded-xl shadow-sm max-w-6xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-lamaSky tracking-tight">
            Announcements
          </h1>
          <p className="text-lamaSky/60 mt-1">
            Manage school announcements and updates
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <TableSearch />
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow transition-all duration-200">
              <Image
                src="/filter.png"
                alt="Filter"
                width={18}
                height={18}
                className="opacity-70"
              />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow transition-all duration-200">
              <Image
                src="/sort.png"
                alt="Sort"
                width={18}
                height={18}
                className="opacity-70"
              />
            </button>
            {role === "admin" && (
              <FormModal table="announcement" type="create" onSuccess={fetchAnnouncements} />
            )}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="overflow-hidden rounded-lg border border-lamaSkyLight/30 bg-white shadow-sm">
        <Table
          columns={columns}
          renderRow={renderRow}
          data={liveAnnouncements}
        />
      </div>

      {/* PAGINATION */}
      <div className="mt-8">
        <Pagination page={page} totalPages={meta?.totalPages ?? 1} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AnnouncementListPage;
