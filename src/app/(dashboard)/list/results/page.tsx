"use client";

import ListPage, { Actions, Cell, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { ResultRecord } from "@/lib/api";
import { formatDate, makeResolvers, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

const columns = [
  { header: "Assessment" },
  { header: "Student", className: "hidden md:table-cell" },
  { header: "Subject", className: "hidden lg:table-cell" },
  { header: "Class", className: "hidden lg:table-cell" },
  { header: "Score", className: "hidden md:table-cell" },
  { header: "Grade", className: "hidden md:table-cell" },
  { header: "Published", className: "hidden lg:table-cell" },
  { header: "Actions" },
];

const ResultListPage = () => {
  const { role } = useCurrentUser();
  const resolve = makeResolvers(useLookups());
  const list = useResourceList<ResultRecord>("/results");
  const canEdit = role === "admin" || role === "teacher";
  const canDelete = role === "admin";

  // A result belongs to either an exam or an assignment; both link to a lesson.
  const source = (r: ResultRecord) => {
    const exam = resolve.exam(r.exam_id);
    const assignment = resolve.assignment(r.assignment_id);
    return {
      title: exam?.title ?? assignment?.title ?? "-",
      kind: r.exam_id ? "Exam" : "Assignment",
      lessonId: exam?.lesson_id ?? assignment?.lesson_id,
      max: exam?.max_score,
    };
  };

  return (
    <ListPage
      title="Results"
      subtitle="Exam and assignment scores"
      columns={columns}
      rows={list.records}
      rowKey={(r) => r.id}
      searchText={(r) => `${source(r).title} ${resolve.studentName(r.student_id)} ${resolve.lessonSubject(source(r).lessonId)} ${r.grade ?? ""}`}
      sortValue={(r) => resolve.studentName(r.student_id)}
      sortLabel="student"
      loading={list.loading}
      error={list.error}
      createTable="result"
      canCreate={canEdit}
      onChanged={list.reload}
      renderCells={(r) => {
        const s = source(r);
        return (
          <>
            <Cell>
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-gray-500">{s.kind}<span className="md:hidden"> · {resolve.studentName(r.student_id)} · {r.score}</span></p>
            </Cell>
            <Cell className="hidden md:table-cell">{resolve.studentName(r.student_id)}</Cell>
            <Cell className="hidden lg:table-cell">{resolve.lessonSubject(s.lessonId)}</Cell>
            <Cell className="hidden lg:table-cell">{resolve.lessonClass(s.lessonId)}</Cell>
            <Cell className="hidden md:table-cell">{r.score}{s.max ? ` / ${s.max}` : ""}</Cell>
            <Cell className="hidden md:table-cell">{r.grade || "-"}</Cell>
            <Cell className="hidden lg:table-cell whitespace-nowrap">{r.published_at ? formatDate(r.published_at) : <span className="text-gray-400">Draft</span>}</Cell>
            <Actions>
              {canEdit && <FormModal table="result" type="update" data={r} onSuccess={list.reload} />}
              {canDelete && <FormModal table="result" type="delete" id={r.id} onSuccess={list.reload} />}
              {!canEdit && !canDelete && <span className="text-gray-400">-</span>}
            </Actions>
          </>
        );
      }}
    />
  );
};

export default ResultListPage;
