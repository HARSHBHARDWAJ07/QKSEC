"use client";

import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Table from "@/components/Table";
import FormModal from "@/components/FormModal";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { PaginationMeta, AssignmentRecord } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Assignment = {
  id: number | string;
  subject: string;
  class: number | string;
  teacher: number | string;
  dueDate: string;
};

function mapAssignment(record: AssignmentRecord): Assignment {
  return {
    id: record.id,
    subject: record.title,
    class: record.lesson_id,
    teacher: record.created_by ?? "-",
    dueDate: new Date(record.due_at).toLocaleDateString(),
  };
}

const columns = [
  {
    header: "Subject",
    accessor: "name",
  },
  {
    header: "Class",
    accessor: "class",
  },
  {
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
  {
    header: "Due Date",
    accessor: "duedate",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const AssignmentListPage = () => {
  const { role } = useCurrentUser();
  const [liveAssignments, setLiveAssignments] = useState<Assignment[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const fetchAssignments = useCallback(() => {
    apiFetch<{ data: AssignmentRecord[]; meta: PaginationMeta }>(`/assignments?page=${page}`)
      .then((response) => {
        setLiveAssignments(response.data.map(mapAssignment));
        setMeta(response.meta);
      })
      .catch(() => undefined);
  }, [page]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const renderRow = (item: Assignment) => (
    <tr
      key={item.id}
      className="border-b border-lamaSkyLight/30 hover:bg-lamaPurpleLight/10 transition-colors duration-200"
    >
      <td className="p-4 text-lamaSky font-medium">{item.subject}</td>
      <td className="p-4 text-lamaSky/80">{item.class}</td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">
        {item.teacher}
      </td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">
        {item.dueDate}
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormModal table="assignment" type="update" data={item} onSuccess={fetchAssignments} />
              <FormModal table="assignment" type="delete" id={item.id} onSuccess={fetchAssignments} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-lamaSkyLight p-6 rounded-xl max-w-6xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-lamaSky tracking-tight">
            Assignments
          </h1>
          <p className="text-lamaSky/60 mt-1">
            Manage and track class assignments
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <TableSearch />
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow-md transition-all duration-200">
              <Image
                src="/filter.png"
                alt="Filter"
                width={18}
                height={18}
                className="opacity-70"
              />
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow-md transition-all duration-200">
              <Image
                src="/sort.png"
                alt="Sort"
                width={18}
                height={18}
                className="opacity-70"
              />
            </button>
            {(role === "admin" || role === "teacher") && (
              <FormModal table="assignment" type="create" onSuccess={fetchAssignments} />
            )}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl border border-lamaSkyLight/30 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          renderRow={renderRow}
          data={liveAssignments}
        />
      </div>

      {/* PAGINATION */}
      <div className="mt-8">
        <Pagination page={page} totalPages={meta?.totalPages ?? 1} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AssignmentListPage;
