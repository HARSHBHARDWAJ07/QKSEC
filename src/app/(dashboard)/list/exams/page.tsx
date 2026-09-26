"use client";

import ListPage, { Actions, Cell, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { ExamRecord } from "@/lib/api";
import { formatDate, formatTime, makeResolvers, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

const columns = [
  { header: "Exam" },
  { header: "Subject", className: "hidden md:table-cell" },
  { header: "Class", className: "hidden md:table-cell" },
  { header: "Teacher", className: "hidden lg:table-cell" },
  { header: "Date", className: "hidden md:table-cell" },
  { header: "Max score", className: "hidden lg:table-cell" },
  { header: "Actions" },
];

const ExamListPage = () => {
  const { role } = useCurrentUser();
  const resolve = makeResolvers(useLookups());
  const list = useResourceList<ExamRecord>("/exams");
  const canManage = role === "admin" || role === "teacher";

  return (
    <ListPage
      title="Exams"
      subtitle="Scheduled examinations"
      columns={columns}
      rows={list.records}
      rowKey={(e) => e.id}
      searchText={(e) => `${e.title} ${resolve.lessonSubject(e.lesson_id)} ${resolve.lessonClass(e.lesson_id)} ${resolve.lessonTeacher(e.lesson_id)}`}
      sortValue={(e) => e.starts_at}
      sortLabel="date"
      loading={list.loading}
      error={list.error}
      createTable="exam"
      canCreate={canManage}
      onChanged={list.reload}
      renderCells={(e) => (
        <>
          <Cell>
            <p className="font-semibold">{e.title}</p>
            <p className="text-xs text-gray-500 md:hidden">{formatDate(e.starts_at)}</p>
          </Cell>
          <Cell className="hidden md:table-cell">{resolve.lessonSubject(e.lesson_id)}</Cell>
          <Cell className="hidden md:table-cell">{resolve.lessonClass(e.lesson_id)}</Cell>
          <Cell className="hidden lg:table-cell">{resolve.lessonTeacher(e.lesson_id)}</Cell>
          <Cell className="hidden md:table-cell whitespace-nowrap">{formatDate(e.starts_at)} · {formatTime(e.starts_at)}</Cell>
          <Cell className="hidden lg:table-cell">{e.max_score}</Cell>
          <Actions>
            {canManage ? (
              <>
                <FormModal table="exam" type="update" data={e} onSuccess={list.reload} />
                <FormModal table="exam" type="delete" id={e.id} onSuccess={list.reload} />
              </>
            ) : <span className="text-gray-400">-</span>}
          </Actions>
        </>
      )}
    />
  );
};

export default ExamListPage;
