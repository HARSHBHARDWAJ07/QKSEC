"use client";

import ListPage, { Actions, Cell, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { ClassRecord } from "@/lib/api";
import { makeResolvers, personName, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

const columns = [
  { header: "Class" },
  { header: "Capacity", className: "hidden md:table-cell" },
  { header: "Enrolled", className: "hidden md:table-cell" },
  { header: "Grade", className: "hidden md:table-cell" },
  { header: "Supervisor", className: "hidden lg:table-cell" },
  { header: "Actions" },
];

const ClassListPage = () => {
  const { role } = useCurrentUser();
  const lookups = useLookups();
  const resolve = makeResolvers(lookups);
  const list = useResourceList<ClassRecord>("/classes");
  const isAdmin = role === "admin";
  const enrolled = (classId: string) => lookups.students.filter((s) => s.class_id === classId).length;
  const supervisor = (c: ClassRecord) => (c.teachers?.profiles ? personName(c.teachers.profiles) : resolve.teacherName(c.supervisor_id));

  return (
    <ListPage
      title="Classes"
      subtitle="Class sections, capacity and supervisors"
      columns={columns}
      rows={list.records}
      rowKey={(c) => c.id}
      searchText={(c) => `${c.name} ${supervisor(c)} grade ${c.grades?.level ?? ""}`}
      sortValue={(c) => c.name}
      loading={list.loading}
      error={list.error}
      page={list.page}
      totalPages={list.meta?.totalPages ?? 1}
      onPageChange={list.setPage}
      createTable="class"
      canCreate={isAdmin}
      onChanged={list.reload}
      renderCells={(c) => (
        <>
          <Cell><span className="font-semibold">{c.name}</span></Cell>
          <Cell className="hidden md:table-cell">{c.capacity}</Cell>
          <Cell className="hidden md:table-cell">{lookups.ready ? enrolled(c.id) : "-"}</Cell>
          <Cell className="hidden md:table-cell">{c.grades?.level ?? resolve.gradeLevel(c.grade_id) ?? "-"}</Cell>
          <Cell className="hidden lg:table-cell">{supervisor(c)}</Cell>
          <Actions>
            {isAdmin ? (
              <>
                <FormModal table="class" type="update" data={c} onSuccess={list.reload} />
                <FormModal table="class" type="delete" id={c.id} onSuccess={list.reload} />
              </>
            ) : <span className="text-gray-400">-</span>}
          </Actions>
        </>
      )}
    />
  );
};

export default ClassListPage;
