"use client";

import ListPage, { Actions, Cell, useResourceList } from "@/components/ListPage";
import FormModal from "@/components/FormModal";
import type { LessonRecord } from "@/lib/api";
import { makeResolvers, useLookups, WEEKDAYS } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

const columns = [
  { header: "Lesson" },
  { header: "Subject", className: "hidden md:table-cell" },
  { header: "Class", className: "hidden md:table-cell" },
  { header: "Teacher", className: "hidden lg:table-cell" },
  { header: "Schedule", className: "hidden md:table-cell" },
  { header: "Actions" },
];

const schedule = (l: LessonRecord) => `${WEEKDAYS[l.weekday - 1] ?? "?"} ${l.start_time.slice(0, 5)}–${l.end_time.slice(0, 5)}`;

const LessonListPage = () => {
  const { role } = useCurrentUser();
  const resolve = makeResolvers(useLookups());
  const list = useResourceList<LessonRecord>("/lessons");
  const isAdmin = role === "admin";
  const subject = (l: LessonRecord) => l.subjects?.name ?? resolve.subjectName(l.subject_id);
  const cls = (l: LessonRecord) => l.classes?.name ?? resolve.className(l.class_id);

  return (
    <ListPage
      title="Lessons"
      subtitle="Weekly timetable slots"
      columns={columns}
      rows={list.records}
      rowKey={(l) => l.id}
      searchText={(l) => `${l.name} ${subject(l)} ${cls(l)} ${resolve.teacherName(l.teacher_id)} ${schedule(l)}`}
      sortValue={(l) => l.weekday * 10000 + Number(l.start_time.replace(/:/g, "").slice(0, 4))}
      sortLabel="schedule"
      loading={list.loading}
      error={list.error}
      createTable="lesson"
      canCreate={isAdmin}
      onChanged={list.reload}
      renderCells={(l) => (
        <>
          <Cell>
            <p className="font-semibold">{l.name}</p>
            <p className="text-xs text-gray-500 md:hidden">{cls(l)} · {schedule(l)}</p>
          </Cell>
          <Cell className="hidden md:table-cell">{subject(l)}</Cell>
          <Cell className="hidden md:table-cell">{cls(l)}</Cell>
          <Cell className="hidden lg:table-cell">{resolve.teacherName(l.teacher_id)}</Cell>
          <Cell className="hidden md:table-cell whitespace-nowrap">{schedule(l)}</Cell>
          <Actions>
            {isAdmin ? (
              <>
                <FormModal table="lesson" type="update" data={l} onSuccess={list.reload} />
                <FormModal table="lesson" type="delete" id={l.id} onSuccess={list.reload} />
              </>
            ) : <span className="text-gray-400">-</span>}
          </Actions>
        </>
      )}
    />
  );
};

export default LessonListPage;
