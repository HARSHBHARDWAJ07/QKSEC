"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { personName, useLookups, WEEKDAYS } from "@/lib/lookups";
import { CloseIcon, PlusIcon } from "./Icons";

type Status = "present" | "absent" | "late" | "excused";
type ExistingRecord = { student_id: string; lesson_id: string; attendance_date: string; status: Status };

const STATUSES: { value: Status; label: string; active: string }[] = [
  { value: "present", label: "Present", active: "bg-green-600 text-white border-green-600" },
  { value: "absent", label: "Absent", active: "bg-red-600 text-white border-red-600" },
  { value: "late", label: "Late", active: "bg-amber-500 text-white border-amber-500" },
  { value: "excused", label: "Excused", active: "bg-slate-600 text-white border-slate-600" },
];

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Marks a whole class for one lesson and date in a single save (bulk upsert).
const TakeAttendance = ({ onSaved }: { onSaved: () => void }) => {
  const lookups = useLookups();
  const [open, setOpen] = useState(false);
  const [lessonId, setLessonId] = useState("");
  const [date, setDate] = useState(today());
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const lesson = lookups.lessons.find((l) => l.id === lessonId);
  const students = useMemo(
    () => (lesson ? lookups.students.filter((s) => s.class_id === lesson.class_id) : [])
      .sort((a, b) => personName(a.profiles).localeCompare(personName(b.profiles))),
    [lesson, lookups.students],
  );
  const lessons = useMemo(
    () => [...lookups.lessons].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)),
    [lookups.lessons],
  );
  const dateWeekday = (new Date(`${date}T00:00:00`).getDay() + 6) % 7 + 1; // 1 = Mon

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Start everyone as present, then overlay anything already recorded.
  useEffect(() => {
    if (!lesson || !date) return;
    let active = true;
    setMessage(null);
    setLoadingExisting(true);
    const initial = Object.fromEntries(students.map((s) => [s.id, "present" as Status]));
    apiFetch<{ data: ExistingRecord[] }>(`/attendance?pageSize=100&from=${date}&to=${date}`)
      .then((response) => {
        if (!active) return;
        for (const record of response.data) {
          if (record.lesson_id === lesson.id && record.student_id in initial) initial[record.student_id] = record.status;
        }
        setStatuses(initial);
      })
      .catch(() => active && setStatuses(initial))
      .finally(() => active && setLoadingExisting(false));
    return () => {
      active = false;
    };
  }, [lesson, date, students]);

  async function save() {
    if (!lesson || students.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/attendance/bulk", undefined, {
        method: "POST",
        body: JSON.stringify({
          lessonId: lesson.id,
          attendanceDate: date,
          records: students.map((s) => ({ studentId: s.id, status: statuses[s.id] ?? "present" })),
        }),
      });
      setMessage({ kind: "success", text: `Saved attendance for ${students.length} student${students.length === 1 ? "" : "s"}.` });
      onSaved();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof ApiError || error instanceof Error ? error.message : "Unable to save attendance." });
    } finally {
      setSaving(false);
    }
  }

  const counts = STATUSES.map((s) => ({ ...s, count: students.filter((st) => (statuses[st.id] ?? "present") === s.value).length }));

  return (
    <>
      <button
        type="button"
        onClick={() => { setMessage(null); setOpen(true); }}
        title="Take attendance"
        aria-label="Take attendance"
        className="h-9 pl-3 pr-4 flex items-center gap-1 rounded-full bg-lamaYellow text-lamaSky text-sm font-medium hover:brightness-95 shrink-0"
      >
        <PlusIcon className="w-4 h-4" /> Take attendance
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Take attendance"
        >
          <div className="bg-white p-6 rounded-xl relative w-full max-w-2xl shadow-xl flex flex-col gap-4 max-h-[90vh]">
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
              <CloseIcon className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Take attendance</h1>

            <div className="flex flex-col md:flex-row gap-4">
              <label className="flex flex-col gap-2 text-xs text-gray-500 flex-1">
                Lesson *
                <select
                  id="attendance-lesson"
                  value={lessonId}
                  onChange={(event) => setLessonId(event.target.value)}
                  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-gray-800 bg-white"
                >
                  <option value="">{lookups.ready ? "Select a lesson…" : "Loading…"}</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {`${l.subjects?.name ?? l.name} · ${l.classes?.name ?? "?"} · ${WEEKDAYS[l.weekday - 1] ?? ""} ${l.start_time.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs text-gray-500 md:w-48">
                Date *
                <input
                  id="attendance-date"
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(event) => setDate(event.target.value)}
                  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-gray-800"
                />
              </label>
            </div>

            {lesson && date && lesson.weekday !== dateWeekday && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-md p-2">
                Note: this lesson is scheduled on {WEEKDAYS[lesson.weekday - 1]}, but the selected date is a {WEEKDAYS[dateWeekday - 1]}.
              </p>
            )}

            {lesson && (
              <div className="flex flex-col gap-2 min-h-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm text-gray-600">
                    {students.length} student{students.length === 1 ? "" : "s"} in {lesson.classes?.name ?? "this class"}
                  </p>
                  {students.length > 0 && (
                    <div className="flex gap-2 text-xs">
                      <button type="button" className="underline text-gray-500 hover:text-gray-800" onClick={() => setStatuses(Object.fromEntries(students.map((s) => [s.id, "present"])))}>
                        Mark all present
                      </button>
                      <span className="text-gray-300">|</span>
                      {counts.map((c) => <span key={c.value} className="text-gray-500">{c.label}: {c.count}</span>)}
                    </div>
                  )}
                </div>
                <div className="overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-100">
                  {loadingExisting && <p className="text-sm text-gray-400 p-4">Loading…</p>}
                  {!loadingExisting && students.length === 0 && (
                    <p className="text-sm text-gray-500 p-4">No students are enrolled in this class yet.</p>
                  )}
                  {!loadingExisting && students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between gap-3 p-3 flex-wrap">
                      <div>
                        <p className="text-sm font-medium">{personName(student.profiles)}</p>
                        <p className="text-xs text-gray-400">{student.student_number}</p>
                      </div>
                      <div className="flex gap-1" role="radiogroup" aria-label={`Status for ${personName(student.profiles)}`}>
                        {STATUSES.map((s) => {
                          const selected = (statuses[student.id] ?? "present") === s.value;
                          return (
                            <button
                              key={s.value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setStatuses((current) => ({ ...current, [student.id]: s.value }))}
                              className={`text-xs px-2.5 py-1 rounded-full border ${selected ? s.active : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {message && (
              <p className={`text-sm ${message.kind === "error" ? "text-red-600" : "text-green-600"}`} role={message.kind === "error" ? "alert" : "status"}>
                {message.text}
              </p>
            )}

            <button
              type="button"
              onClick={save}
              disabled={!lesson || students.length === 0 || saving || loadingExisting}
              className="bg-lamaPurple text-white p-3 rounded-md font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save attendance"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TakeAttendance;
