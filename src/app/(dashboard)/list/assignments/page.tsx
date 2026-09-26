"use client";

import ListPage, { Actions, Cell, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { AssignmentRecord } from "@/lib/api";
import { formatDate, makeResolvers, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

const columns = [
  { header: "Assignment" },
  { header: "Subject", className: "hidden md:table-cell" },
  { header: "Class", className: "hidden md:table-cell" },
  { header: "Teacher", className: "hidden lg:table-cell" },
  { header: "Start", className: "hidden lg:table-cell" },
  { header: "Due", className: "hidden md:table-cell" },
  { header: "Actions" },
];

const AssignmentListPage = () => {
  const { role } = useCurrentUser();
  const resolve = makeResolvers(useLookups());
  const list = useResourceList<AssignmentRecord>("/assignments");
  const canManage = role === "admin" || role === "teacher";

  return (
    <ListPage
      title="Assignments"
      subtitle="Homework and coursework"
      columns={columns}
      rows={list.records}
      rowKey={(a) => a.id}
      searchText={(a) => `${a.title} ${resolve.lessonSubject(a.lesson_id)} ${resolve.lessonClass(a.lesson_id)} ${resolve.lessonTeacher(a.lesson_id)}`}
      sortValue={(a) => a.due_at}
      sortLabel="due date"
      loading={list.loading}
      error={list.error}
      createTable="assignment"
      canCreate={canManage}
      onChanged={list.reload}
      renderCells={(a) => (
        <>
          <Cell>
            <p className="font-semibold">{a.title}</p>
            {a.description && <p className="text-xs text-gray-500 line-clamp-1">{a.description}</p>}
          </Cell>
          <Cell className="hidden md:table-cell">{resolve.lessonSubject(a.lesson_id)}</Cell>
          <Cell className="hidden md:table-cell">{resolve.lessonClass(a.lesson_id)}</Cell>
          <Cell className="hidden lg:table-cell">{resolve.lessonTeacher(a.lesson_id)}</Cell>
          <Cell className="hidden lg:table-cell whitespace-nowrap">{formatDate(a.start_at)}</Cell>
          <Cell className="hidden md:table-cell whitespace-nowrap">{formatDate(a.due_at)}</Cell>
          <Actions>
            {canManage ? (
              <>
                <FormModal table="assignment" type="update" data={a} onSuccess={list.reload} />
                <FormModal table="assignment" type="delete" id={a.id} onSuccess={list.reload} />
              </>
            ) : <span className="text-gray-400">-</span>}
          </Actions>
        </>
      )}
    />
  );
};

export default AssignmentListPage;
