"use client";

import Image from "next/image";
import ListPage, { Actions, Cell, ViewLink, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { StudentRecord } from "@/lib/api";
import { makeResolvers, personName, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

const columns = [
  { header: "Student" },
  { header: "Student ID", className: "hidden md:table-cell" },
  { header: "Class", className: "hidden md:table-cell" },
  { header: "Grade", className: "hidden md:table-cell" },
  { header: "Phone", className: "hidden lg:table-cell" },
  { header: "Address", className: "hidden xl:table-cell" },
  { header: "Actions" },
];

const StudentListPage = () => {
  const { role } = useCurrentUser();
  const lookups = useLookups();
  const resolve = makeResolvers(lookups);
  const list = useResourceList<StudentRecord>("/students");
  const isAdmin = role === "admin";

  return (
    <ListPage
      title="Students"
      subtitle="All enrolled students"
      columns={columns}
      rows={list.records}
      rowKey={(s) => s.id}
      searchText={(s) => `${personName(s.profiles)} ${s.student_number} ${resolve.className(s.class_id)} ${s.profiles?.phone ?? ""}`}
      sortValue={(s) => personName(s.profiles)}
      loading={list.loading}
      error={list.error}
      page={list.page}
      totalPages={list.meta?.totalPages ?? 1}
      onPageChange={list.setPage}
      createTable="student"
      canCreate={isAdmin}
      onChanged={list.reload}
      renderCells={(s) => (
        <>
          <Cell>
            <div className="flex items-center gap-3">
              <Image src={s.profiles?.avatar_path || "/avatar.png"} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-semibold">{personName(s.profiles, "Unnamed student")}</p>
                <p className="text-xs text-gray-500 md:hidden">{resolve.className(s.class_id)}</p>
              </div>
            </div>
          </Cell>
          <Cell className="hidden md:table-cell">{s.student_number}</Cell>
          <Cell className="hidden md:table-cell">{resolve.className(s.class_id)}</Cell>
          <Cell className="hidden md:table-cell">{resolve.classGradeLevel(s.class_id) ?? "-"}</Cell>
          <Cell className="hidden lg:table-cell">{s.profiles?.phone || "-"}</Cell>
          <Cell className="hidden xl:table-cell">{s.profiles?.address || "-"}</Cell>
          <Actions>
            <ViewLink href={`/list/students/view?id=${s.id}`} label={`View ${personName(s.profiles)}`} />
            {isAdmin && (
              <>
                <FormModal table="student" type="update" data={s} onSuccess={list.reload} />
                <FormModal table="student" type="delete" id={s.id} onSuccess={list.reload} />
              </>
            )}
          </Actions>
        </>
      )}
    />
  );
};

export default StudentListPage;
