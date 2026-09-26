"use client";

import ListPage, { Cell, useResourceList } from "@/components/ListPage";
import TakeAttendance from "@/components/TakeAttendance";
import { formatDate, makeResolvers, useLookups } from "@/lib/lookups";
import { useCurrentUser } from "@/lib/useCurrentUser";

type AttendanceRecord = {
  id: string;
  student_id: string;
  lesson_id: string;
  attendance_date: string;
  status: "present" | "absent" | "late" | "excused";
};

const statusStyle: Record<AttendanceRecord["status"], string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  excused: "bg-slate-200 text-slate-700",
};

const columns = [
  { header: "Student" },
  { header: "Lesson", className: "hidden md:table-cell" },
  { header: "Class", className: "hidden md:table-cell" },
  { header: "Date" },
  { header: "Status" },
];

const AttendanceListPage = () => {
  const { role } = useCurrentUser();
  const resolve = makeResolvers(useLookups());
  const list = useResourceList<AttendanceRecord>("/attendance");
  const canMark = role === "admin" || role === "teacher";

  return (
    <ListPage
      title="Attendance"
      subtitle="Lesson attendance records. Taking attendance again for the same lesson and date updates it."
      columns={columns}
      rows={list.records}
      rowKey={(r) => r.id}
      searchText={(r) => `${resolve.studentName(r.student_id)} ${resolve.lessonSubject(r.lesson_id)} ${resolve.lessonClass(r.lesson_id)} ${r.status}`}
      sortValue={(r) => r.attendance_date}
      sortLabel="date"
      loading={list.loading}
      error={list.error}
      onChanged={list.reload}
      actions={canMark ? <TakeAttendance onSaved={list.reload} /> : undefined}
      emptyText={canMark ? "No attendance recorded yet. Use \"Take attendance\" to mark a class." : "No attendance recorded yet."}
      renderCells={(r) => (
        <>
          <Cell><span className="font-semibold">{resolve.studentName(r.student_id)}</span></Cell>
          <Cell className="hidden md:table-cell">{resolve.lessonSubject(r.lesson_id)}</Cell>
          <Cell className="hidden md:table-cell">{resolve.lessonClass(r.lesson_id)}</Cell>
          <Cell className="whitespace-nowrap">{formatDate(r.attendance_date)}</Cell>
          <Cell>
            <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusStyle[r.status] ?? ""}`}>{r.status}</span>
          </Cell>
        </>
      )}
    />
  );
};

export default AttendanceListPage;
