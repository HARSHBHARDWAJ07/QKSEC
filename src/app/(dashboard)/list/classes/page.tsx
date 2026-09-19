"use client";

import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import FormModal from "@/components/FormModal";
import Image from "next/image";
import Table from "@/components/Table";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { PaginationMeta, ClassRecord } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Class = {
  id: number | string;
  name: string;
  capacity: number;
  grade: number | string;
  supervisor: string;
};

function mapClass(record: ClassRecord): Class {
  const supervisorProfile = record.teachers?.profiles;
  return {
    id: record.id,
    name: record.name,
    capacity: record.capacity,
    grade: record.grades?.level ?? record.grade_id,
    supervisor: supervisorProfile
      ? `${supervisorProfile.first_name} ${supervisorProfile.last_name}`
      : "-",
  };
}

const columns = [
  {
    header: "Class Name",
    accessor: "name",
  },
  {
    header: "Capacity",
    accessor: "capacity",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Supervisor",
    accessor: "supervisor",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const ClassListPage = () => {
  const { role } = useCurrentUser();
  const [liveClasses, setLiveClasses] = useState<Class[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const fetchClasses = useCallback(() => {
    apiFetch<{ data: ClassRecord[]; meta: PaginationMeta }>(`/classes?page=${page}`)
      .then((response) => {
        setLiveClasses(response.data.map(mapClass));
        setMeta(response.meta);
      })
      .catch(() => undefined);
  }, [page]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const renderRow = (item: Class) => (
    <tr
      key={item.id}
      className="border-b border-lamaSkyLight/30 hover:bg-lamaPurpleLight/10 transition-colors duration-200"
    >
      <td className="p-4 text-lamaSky font-medium">{item.name}</td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">
        {item.capacity}
      </td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">{item.grade}</td>
      <td className="p-4 text-lamaSky/70 hidden md:table-cell">
        {item.supervisor}
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/list/teachers/${item.id}`} passHref>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-lamaSkyLight shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Image
                src="/edit.png"
                alt="Edit Class"
                width={16}
                height={16}
                className="opacity-70"
              />
            </button>
          </Link>
          {role === "admin" && (
            <>
              <FormModal table="class" type="update" data={item} onSuccess={fetchClasses} />
              <FormModal table="class" type="delete" id={item.id} onSuccess={fetchClasses} />
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
            Classes
          </h1>
          <p className="text-lamaSky/60 mt-1">
            Manage all academic classes and sections
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
            {role === "admin" && (
              <FormModal table="class" type="create" onSuccess={fetchClasses} />
            )}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl border border-lamaSkyLight/30 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          renderRow={renderRow}
          data={liveClasses}
        />
      </div>

      {/* PAGINATION */}
      <div className="mt-8">
        <Pagination page={page} totalPages={meta?.totalPages ?? 1} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default ClassListPage;
