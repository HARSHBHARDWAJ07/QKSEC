"use client";

import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Table from "@/components/Table";
import FormModal from "@/components/FormModal";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { PaginationMeta, ResultRecord } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Result = {
  id: number | string;
  subject: string;
  class: number | string;
  teacher: number | string;
  student: string;
  type: "exam" | "assignment";
  date: string;
  score: number;
};

function mapResult(record: ResultRecord): Result {
  return {
    id: record.id,
    subject: record.exam_id ? "Exam" : "Assignment",
    class: "-",
    teacher: "-",
    student: record.student_id,
    type: record.exam_id ? "exam" : "assignment",
    date: record.published_at ? new Date(record.published_at).toLocaleDateString() : "-",
    score: record.score,
  };
}

const columns = [
  {
    header: "Subject",
    accessor: "name",
  },
  {
    header: "Student",
    accessor: "student",
  },
  {
    header: "Score",
    accessor: "score",
  },
  {
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
  {
    header: "Class",
    accessor: "class",
    className: "hidden md:table-cell",
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

const ResultListPage = () => {
  const { role } = useCurrentUser();
  const [liveResults, setLiveResults] = useState<Result[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const fetchResults = useCallback(() => {
    apiFetch<{ data: ResultRecord[]; meta: PaginationMeta }>(`/results?page=${page}`)
      .then((response) => {
        setLiveResults(response.data.map(mapResult));
        setMeta(response.meta);
      })
      .catch(() => undefined);
  }, [page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-lamaSky";
    if (score >= 60) return "text-lamaYellow";
    return "text-red-500";
  };

  const renderRow = (item: Result) => (
    <tr
      key={item.id}
      className="border-b border-lamaSkyLight/30 hover:bg-lamaPurpleLight/10 transition-colors duration-200"
    >
      <td className="p-4 text-lamaSky font-medium">{item.subject}</td>
      <td className="p-4 text-lamaSky/80">{item.student}</td>
      <td className="p-4">
        <span className={`font-medium ${getScoreColor(item.score)}`}>
          {item.score}%
        </span>
      </td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">
        {item.teacher}
      </td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">
        Class {item.class}
      </td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">{item.date}</td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormModal table="result" type="update" data={item} onSuccess={fetchResults} />
              {role === "admin" && (
                <FormModal table="result" type="delete" id={item.id} onSuccess={fetchResults} />
              )}
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
            Academic Results
          </h1>
          <p className="text-lamaSky/60 mt-1">
            Track and manage student performance
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
              <FormModal table="result" type="create" onSuccess={fetchResults} />
            )}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl border border-lamaSkyLight/30 shadow-sm overflow-x-auto">
        <Table
          columns={columns}
          renderRow={renderRow}
          data={liveResults}
        />
      </div>

      {/* PAGINATION */}
      <div className="mt-8">
        <Pagination page={page} totalPages={meta?.totalPages ?? 1} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default ResultListPage;
