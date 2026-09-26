"use client";

import { useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { endpointByTable } from "@/lib/entityEndpoints";
import { invalidateLookups, personName, useLookups, WEEKDAYS, type Lookups } from "@/lib/lookups";

type FieldType = "text" | "email" | "password" | "number" | "date" | "datetime" | "time" | "textarea" | "select";
type RefKind = "lesson" | "subject" | "class" | "teacher" | "student" | "exam" | "assignment" | "grade" | "academicYear" | "weekday" | "status";

type Field = {
  name: string;
  label: string;
  type?: FieldType;
  ref?: RefKind;
  optional?: boolean;
  // On update, clearing a nullable field sends null (instead of leaving it unchanged).
  nullable?: boolean;
};

type EntityFormProps = {
  table: string;
  type: "create" | "update";
  // For updates: the raw API record (snake_case, may include a nested `profiles`).
  data?: Record<string, unknown>;
  onSuccess?: () => void;
};

const ref = (name: string, label: string, kind: RefKind, extra: Partial<Field> = {}): Field => ({ name, label, type: "select", ref: kind, ...extra });

const profileFields: Field[] = [
  { name: "firstName", label: "First name" }, { name: "lastName", label: "Last name" },
  { name: "phone", label: "Phone", optional: true, nullable: true },
  { name: "address", label: "Address", optional: true, nullable: true },
];
const accountFields: Field[] = [
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Password (min 8 chars)", type: "password" },
];
const dobField: Field = { name: "dateOfBirth", label: "Date of birth", type: "date", optional: true, nullable: true };

const createFields: Record<string, Field[]> = {
  teacher: [...accountFields, ...profileFields, { name: "employeeNumber", label: "Employee number" }, dobField],
  student: [...accountFields, ...profileFields, { name: "studentNumber", label: "Student number" }, ref("classId", "Class", "class"), dobField],
  parent: [...accountFields, ...profileFields],
  subject: [{ name: "name", label: "Subject name" }],
  class: [
    { name: "name", label: "Class name" }, { name: "capacity", label: "Capacity", type: "number" },
    ref("gradeId", "Grade", "grade"), ref("academicYearId", "Academic year", "academicYear"),
    ref("supervisorId", "Supervisor", "teacher", { optional: true, nullable: true }),
  ],
  lesson: [
    { name: "name", label: "Lesson name" }, ref("subjectId", "Subject", "subject"),
    ref("classId", "Class", "class"), ref("teacherId", "Teacher", "teacher"),
    ref("weekday", "Day", "weekday"), { name: "startTime", label: "Starts", type: "time" }, { name: "endTime", label: "Ends", type: "time" },
  ],
  exam: [
    { name: "title", label: "Title" }, ref("lessonId", "Lesson", "lesson"),
    { name: "startsAt", label: "Starts", type: "datetime" }, { name: "endsAt", label: "Ends", type: "datetime" },
    { name: "maxScore", label: "Maximum score", type: "number" },
  ],
  assignment: [
    { name: "title", label: "Title" }, ref("lessonId", "Lesson", "lesson"),
    { name: "startAt", label: "Starts", type: "datetime" }, { name: "dueAt", label: "Due", type: "datetime" },
    { name: "description", label: "Description", type: "textarea", optional: true, nullable: true },
  ],
  result: [
    ref("studentId", "Student", "student"),
    ref("examId", "Exam", "exam", { optional: true }), ref("assignmentId", "Assignment", "assignment", { optional: true }),
    { name: "score", label: "Score", type: "number" }, { name: "grade", label: "Grade", optional: true, nullable: true },
    { name: "publishedAt", label: "Publish at", type: "datetime", optional: true, nullable: true },
    { name: "feedback", label: "Feedback", type: "textarea", optional: true, nullable: true },
  ],
  attendance: [
    ref("studentId", "Student", "student"), ref("lessonId", "Lesson", "lesson"),
    { name: "attendanceDate", label: "Date", type: "date" }, ref("status", "Status", "status"),
  ],
  event: [
    { name: "title", label: "Title" }, ref("classId", "Class (empty = whole school)", "class", { optional: true, nullable: true }),
    { name: "startsAt", label: "Starts", type: "datetime" }, { name: "endsAt", label: "Ends", type: "datetime" },
    { name: "description", label: "Description", type: "textarea", optional: true, nullable: true },
  ],
  announcement: [
    { name: "title", label: "Title" },
    { name: "publishedAt", label: "Publish at (empty = draft)", type: "datetime", optional: true, nullable: true },
    { name: "expiresAt", label: "Expires at", type: "datetime", optional: true, nullable: true },
    { name: "body", label: "Message", type: "textarea" },
  ],
};

// Fields each backend PATCH endpoint accepts (identity fields such as a
// result's student/exam or an exam's lesson can't be changed after creation).
const updateFields: Record<string, Field[]> = {
  teacher: [...profileFields, { name: "employeeNumber", label: "Employee number" }, dobField],
  student: [...profileFields, { name: "studentNumber", label: "Student number" }, ref("classId", "Class", "class"), dobField],
  parent: profileFields,
  subject: createFields.subject,
  class: createFields.class,
  lesson: createFields.lesson,
  exam: createFields.exam.filter((field) => field.name !== "lessonId"),
  assignment: createFields.assignment.filter((field) => field.name !== "lessonId"),
  result: createFields.result.filter((field) => !["studentId", "examId", "assignmentId"].includes(field.name)),
  event: createFields.event,
  announcement: createFields.announcement,
};

type Option = { value: string; label: string };

function optionsFor(kind: RefKind, lookups: Lookups): Option[] {
  switch (kind) {
    case "lesson":
      return lookups.lessons.map((l) => ({ value: l.id, label: `${l.subjects?.name ?? l.name} · ${l.classes?.name ?? "?"} · ${WEEKDAYS[l.weekday - 1] ?? ""} ${l.start_time.slice(0, 5)}` }));
    case "subject":
      return lookups.subjects.map((s) => ({ value: s.id, label: s.name }));
    case "class":
      return lookups.classes.map((c) => ({ value: c.id, label: c.name }));
    case "teacher":
      return lookups.teachers.map((t) => ({ value: t.id, label: `${personName(t.profiles)} (${t.employee_number})` }));
    case "student":
      return lookups.students.map((s) => ({ value: s.id, label: `${personName(s.profiles)} (${s.student_number})` }));
    case "exam":
      return lookups.exams.map((e) => ({ value: e.id, label: e.title }));
    case "assignment":
      return lookups.assignments.map((a) => ({ value: a.id, label: a.title }));
    case "grade":
      return [...lookups.grades].sort((a, b) => a.level - b.level).map((g) => ({ value: g.id, label: `Grade ${g.level}` }));
    case "academicYear":
      return lookups.academicYears.map((y) => ({ value: y.id, label: `${y.name}${y.is_current ? " (current)" : ""}` }));
    case "weekday":
      return WEEKDAYS.map((day, index) => ({ value: String(index + 1), label: day }));
    case "status":
      return ["present", "absent", "late", "excused"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));
  }
}

const camel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

// ISO timestamp -> value for <input type="datetime-local"> in the user's timezone.
function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Raw API record -> form values keyed by the form's camelCase field names.
function initialValues(fields: Field[], record?: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, unknown> = {};
  if (record) {
    for (const [key, value] of Object.entries(record)) flat[camel(key)] = value;
    const profile = record.profiles as Record<string, unknown> | null | undefined;
    if (profile && typeof profile === "object") {
      for (const [key, value] of Object.entries(profile)) if (key !== "id") flat[camel(key)] = value;
    }
  }
  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = flat[field.name];
    if (value === null || value === undefined) {
      values[field.name] = field.ref === "status" ? "present" : "";
    } else if (field.type === "datetime") {
      values[field.name] = toLocalInput(String(value));
    } else if (field.type === "time") {
      values[field.name] = String(value).slice(0, 5);
    } else if (field.type === "date") {
      values[field.name] = String(value).slice(0, 10);
    } else {
      values[field.name] = String(value);
    }
  }
  return values;
}

const inputClass = "ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-gray-800 bg-white focus:outline-none focus:ring-lamaPurple";

export default function EntityForm({ table, type, data, onSuccess }: EntityFormProps) {
  const lookups = useLookups();
  const fields = useMemo(() => (type === "update" ? updateFields[table] : createFields[table]) ?? [], [table, type]);
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(fields, data));
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (fields.length === 0) {
    return <p className="p-4 text-sm text-gray-600">This form is not available for {table}.</p>;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = values[field.name]?.trim() ?? "";
      if (raw === "") {
        if (type === "update" && field.nullable) payload[field.name] = null;
        continue;
      }
      if (field.type === "number" || field.ref === "weekday") payload[field.name] = Number(raw);
      else if (field.type === "datetime") payload[field.name] = new Date(raw).toISOString();
      else payload[field.name] = raw;
    }

    if (table === "result" && type === "create" && !payload.examId === !payload.assignmentId) {
      setMessage({ kind: "error", text: "Choose either an exam or an assignment (exactly one)." });
      return;
    }

    const endpoint = endpointByTable[table];
    const id = data?.id;
    if (!endpoint || (type === "update" && !id)) {
      setMessage({ kind: "error", text: "This record can't be saved." });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(type === "update" ? `/${endpoint}/${id}` : `/${endpoint}`, undefined, {
        method: type === "update" ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      invalidateLookups();
      setMessage({ kind: "success", text: `Saved successfully.` });
      onSuccess?.();
    } catch (error) {
      const details = error instanceof ApiError ? fieldErrors(error.details) : "";
      const text = error instanceof Error ? error.message : "Unable to save record.";
      setMessage({ kind: "error", text: details ? `${text}: ${details}` : text });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold capitalize">{type === "create" ? "Add" : "Edit"} {table}</h1>
      <div className="flex flex-wrap gap-4 max-h-[60vh] overflow-y-auto p-1">
        {fields.map((field) => {
          const common = {
            id: `${table}-${field.name}`,
            required: !field.optional,
            value: values[field.name] ?? "",
            onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
              setValues((current) => ({ ...current, [field.name]: event.target.value })),
            className: inputClass,
          };
          const wide = field.type === "textarea";
          return (
            <label key={field.name} htmlFor={common.id} className={`flex flex-col gap-2 text-xs text-gray-500 w-full ${wide ? "" : "md:w-[calc(50%-0.5rem)]"}`}>
              <span>{field.label}{field.optional ? "" : " *"}</span>
              {field.type === "select" && field.ref ? (
                <select {...common}>
                  <option value="">{field.optional ? "— None —" : lookups.ready ? "Select…" : "Loading…"}</option>
                  {optionsFor(field.ref, lookups).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea {...common} rows={3} />
              ) : (
                <input
                  {...common}
                  type={field.type === "datetime" ? "datetime-local" : field.type ?? "text"}
                  min={field.type === "number" ? 0 : undefined}
                  step={field.name === "score" || field.name === "maxScore" ? "0.01" : undefined}
                  minLength={field.type === "password" ? 8 : undefined}
                />
              )}
            </label>
          );
        })}
      </div>
      {message && (
        <p className={`text-sm ${message.kind === "error" ? "text-red-600" : "text-green-600"}`} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={submitting} className="bg-lamaPurple text-white p-3 rounded-md font-medium disabled:opacity-60">
        {submitting ? "Saving..." : type === "create" ? "Create" : "Save changes"}
      </button>
    </form>
  );
}

function fieldErrors(details: unknown): string {
  const fieldErrs = (details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
  if (!fieldErrs) return "";
  return Object.entries(fieldErrs).map(([name, errs]) => `${name} ${errs.join(", ")}`).join("; ");
}
