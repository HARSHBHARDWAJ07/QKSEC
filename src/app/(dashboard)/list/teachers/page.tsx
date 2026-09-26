"use client";

import Image from "next/image";
import ListPage, { Actions, Cell, Chips, ViewLink, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { TeacherRecord } from "@/lib/api";
import { makeResolvers, personName, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

const columns = [
  { header: "Teacher" },
  { header: "Employee ID", className: "hidden md:table-cell" },
  { header: "Subjects", className: "hidden md:table-cell" },
  { header: "Classes", className: "hidden md:table-cell" },
  { header: "Phone", className: "hidden lg:table-cell" },
  { header: "Address", className: "hidden xl:table-cell" },
  { header: "Actions" },
];

const TeacherListPage = () => {
  const { role } = useCurrentUser();
  const lookups = useLookups();
  const resolve = makeResolvers(lookups);
  const list = useResourceList<TeacherRecord>("/teachers");
  const isAdmin = role === "admin";

  return (
    <ListPage
      title="Teachers"
      subtitle="Faculty directory"
      columns={columns}
      rows={list.records}
      rowKey={(t) => t.id}
      searchText={(t) => `${personName(t.profiles)} ${t.employee_number} ${t.profiles?.phone ?? ""} ${resolve.teacherSubjects(t.id).join(" ")}`}
      sortValue={(t) => personName(t.profiles)}
      loading={list.loading}
      error={list.error}
      createTable="teacher"
      canCreate={isAdmin}
      onChanged={list.reload}
      renderCells={(t) => (
        <>
          <Cell>
            <div className="flex items-center gap-3">
              <Image src={t.profiles?.avatar_path || "/avatar.png"} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-semibold">{personName(t.profiles, "Unnamed teacher")}</p>
                <p className="text-xs text-gray-500 md:hidden">{t.employee_number}</p>
              </div>
            </div>
          </Cell>
          <Cell className="hidden md:table-cell">{t.employee_number}</Cell>
          <Cell className="hidden md:table-cell"><Chips items={resolve.teacherSubjects(t.id)} /></Cell>
          <Cell className="hidden md:table-cell"><Chips items={resolve.teacherClasses(t.id)} /></Cell>
          <Cell className="hidden lg:table-cell">{t.profiles?.phone || "-"}</Cell>
          <Cell className="hidden xl:table-cell">{t.profiles?.address || "-"}</Cell>
          <Actions>
            <ViewLink href={`/list/teachers/view?id=${t.id}`} label={`View ${personName(t.profiles)}`} />
            {isAdmin && (
              <>
                <FormModal table="teacher" type="update" data={t} onSuccess={list.reload} />
                <FormModal table="teacher" type="delete" id={t.id} onSuccess={list.reload} />
              </>
            )}
          </Actions>
        </>
      )}
    />
  );
};

export default TeacherListPage;
