"use client";

import Pagination from "@/components/Pagination";
import TableSearch from "@/components/TableSearch";
import FormModal from "@/components/FormModal";
import Image from "next/image";
import Table from "@/components/Table";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { PaginationMeta, StudentRecord, StudentsResponse } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";

type Student = {
  id: number | string;
  studentId: string;
  name: string;
  email?: string;
  photo: string;
  phone?: string;
  grade: number | string;
  class: string;
  address: string;
};

function mapStudent(record: StudentRecord): Student {
  return {
    id: record.id,
    studentId: record.student_number,
    name: record.profiles ? `${record.profiles.first_name} ${record.profiles.last_name}` : "Unnamed student",
    photo: record.profiles?.avatar_path || "/student.png",
    phone: record.profiles?.phone ?? undefined,
    grade: "-",
    class: record.class_id,
    address: record.profiles?.address ?? "N/A",
  };
}

const columns = [
  { header: "Info", accessor: "info" },
  { 
    header: "Student ID",
    accessor: "studentID",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  { header: "Actions", accessor: "action" }
];

const StudentListPage = () => {
  const { role } = useCurrentUser();
  const [liveStudents, setLiveStudents] = useState<Student[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const fetchStudents = useCallback(() => {
    apiFetch<StudentsResponse>(`/students?page=${page}`)
      .then((response) => {
        setLiveStudents(response.data.map(mapStudent));
        setMeta(response.meta);
      })
      .catch(() => undefined);
  }, [page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const renderRow = (item: Student) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="flex items-center gap-4 p-4">
        <Image 
          src={item.photo} 
          alt={item.name}
          width={48} 
          height={48} 
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"  
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item.class}</p>
        </div>
      </td>
      <td className="hidden md:table-cell p-4">{item.studentId}</td>
      <td className="hidden md:table-cell p-4">{item.grade}</td>
      <td className="hidden lg:table-cell p-4">{item.phone || "N/A"}</td>
      <td className="hidden lg:table-cell p-4">{item.address}</td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Link href={`/list/students/view?id=${item.id}`} passHref>
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-lamaSky"
            >
              <Image
                src="/view.png"
                alt={`View ${item.name}'s details`}
                width={16}
                height={16}
                priority
              />
            </button>
          </Link>
          {role === "admin" && (
            <FormModal table="student" type="delete" id={item.id} onSuccess={fetchStudents} />
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-lg font-semibold text-lamaSky">All Students</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <TableSearch />
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaSkyLight border border-lamaSkyLight/30 shadow-sm hover:shadow-md transition-all duration-200">
              <Image src="/filter.png" alt="Filter" width={16} height={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaSkyLight border border-lamaSkyLight/30 shadow-sm hover:shadow-md transition-all duration-200">
              <Image src="/sort.png" alt="Sort" width={16} height={16} />
            </button>
            {role === "admin" && (
              <FormModal table="student" type="create" onSuccess={fetchStudents} />
            )}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <Table 
        columns={columns} 
        renderRow={renderRow} 
        data={liveStudents} 
      />

      {/* PAGINATION */}
      <div className="mt-6">
        <Pagination page={page} totalPages={meta?.totalPages ?? 1} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default StudentListPage;