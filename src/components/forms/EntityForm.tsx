"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { endpointByTable, updatableTables } from "@/lib/entityEndpoints";

type EntityFormProps = {
  table: string;
  type: "create" | "update";
  data?: Record<string, string | number | null>;
  onSuccess?: () => void;
};

const createFields: Record<string, Array<{ name: string; label: string; type?: string }>> = {
  assignment: [
    { name: "title", label: "Title" }, { name: "description", label: "Description" },
    { name: "startAt", label: "Starts", type: "datetime-local" }, { name: "dueAt", label: "Due", type: "datetime-local" },
    { name: "lessonId", label: "Lesson ID" },
  ],
  exam: [
    { name: "title", label: "Title" }, { name: "startsAt", label: "Starts", type: "datetime-local" },
    { name: "endsAt", label: "Ends", type: "datetime-local" }, { name: "maxScore", label: "Maximum score", type: "number" },
    { name: "lessonId", label: "Lesson ID" },
  ],
  result: [
    { name: "studentId", label: "Student ID" }, { name: "examId", label: "Exam ID" },
    { name: "assignmentId", label: "Assignment ID" }, { name: "score", label: "Score", type: "number" },
    { name: "grade", label: "Grade" }, { name: "feedback", label: "Feedback" },
  ],
  attendance: [
    { name: "studentId", label: "Student ID" }, { name: "lessonId", label: "Lesson ID" },
    { name: "attendanceDate", label: "Date", type: "date" },
  ],
  subject: [{ name: "name", label: "Subject name" }],
  lesson: [
    { name: "name", label: "Name" }, { name: "weekday", label: "Weekday", type: "number" },
    { name: "startTime", label: "Starts", type: "time" }, { name: "endTime", label: "Ends", type: "time" },
    { name: "subjectId", label: "Subject ID" }, { name: "classId", label: "Class ID" }, { name: "teacherId", label: "Teacher ID" },
  ],
  class: [
    { name: "name", label: "Class name" }, { name: "capacity", label: "Capacity", type: "number" },
    { name: "academicYearId", label: "Academic year ID" }, { name: "gradeId", label: "Grade ID" },
  ],
  event: [
    { name: "title", label: "Title" }, { name: "description", label: "Description" },
    { name: "startsAt", label: "Starts", type: "datetime-local" }, { name: "endsAt", label: "Ends", type: "datetime-local" },
    { name: "classId", label: "Class ID" },
  ],
  announcement: [
    { name: "title", label: "Title" }, { name: "body", label: "Message" },
    { name: "publishedAt", label: "Publish at", type: "datetime-local" }, { name: "expiresAt", label: "Expires at", type: "datetime-local" },
  ],
  student: [
    { name: "email", label: "Email", type: "email" }, { name: "password", label: "Password", type: "password" },
    { name: "firstName", label: "First name" }, { name: "lastName", label: "Last name" }, { name: "studentNumber", label: "Student number" }, { name: "classId", label: "Class ID" },
    { name: "phone", label: "Phone" }, { name: "address", label: "Address" }, { name: "dateOfBirth", label: "Date of birth", type: "date" },
  ],
  teacher: [
    { name: "email", label: "Email", type: "email" }, { name: "password", label: "Password", type: "password" },
    { name: "firstName", label: "First name" }, { name: "lastName", label: "Last name" }, { name: "employeeNumber", label: "Employee number" },
    { name: "phone", label: "Phone" }, { name: "address", label: "Address" }, { name: "dateOfBirth", label: "Date of birth", type: "date" },
  ],
  parent: [
    { name: "email", label: "Email", type: "email" }, { name: "password", label: "Password", type: "password" },
    { name: "firstName", label: "First name" }, { name: "lastName", label: "Last name" }, { name: "phone", label: "Phone" }, { name: "address", label: "Address" },
  ],
};

// Some resources only allow a subset of their create fields to be changed on update
// (e.g. a result's studentId/examId/assignmentId are identity fields on the backend).
const updateFields: Record<string, Array<{ name: string; label: string; type?: string }>> = {
  assignment: [
    { name: "title", label: "Title" }, { name: "description", label: "Description" },
    { name: "startAt", label: "Starts", type: "datetime-local" }, { name: "dueAt", label: "Due", type: "datetime-local" },
  ],
  lesson: createFields.lesson,
  result: [
    { name: "score", label: "Score", type: "number" }, { name: "grade", label: "Grade" },
    { name: "feedback", label: "Feedback" }, { name: "publishedAt", label: "Publish at", type: "datetime-local" },
  ],
  announcement: createFields.announcement,
  subject: createFields.subject,
  parent: [
    { name: "firstName", label: "First name" }, { name: "lastName", label: "Last name" },
    { name: "phone", label: "Phone" }, { name: "address", label: "Address" },
  ],
};

export default function EntityForm({ table, type, data, onSuccess }: EntityFormProps) {
  const [values, setValues] = useState<Record<string, string | number | null>>(data ?? {});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const tableFields = (type === "update" ? updateFields[table] : createFields[table]) ?? [];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (type === "update" && !updatableTables.has(table)) {
      setMessage("Update endpoints are not available for this resource yet.");
      return;
    }

    const payload: Record<string, string | number | null> = {};
    for (const field of tableFields) {
      payload[field.name] = values[field.name] ?? null;
    }

    if (table === "attendance") payload.status = (values.status as string) || "present";
    if (table === "result" && type === "create" && !payload.examId && !payload.assignmentId) {
      setMessage("Enter an exam ID or assignment ID.");
      return;
    }

    setSubmitting(true);
    try {
      for (const field of ["startAt", "dueAt", "startsAt", "endsAt", "publishedAt", "expiresAt"]) {
        if (typeof payload[field] === "string" && payload[field] && !payload[field].includes("Z")) payload[field] = `${payload[field]}:00.000Z`;
      }
      const endpoint = endpointByTable[table];
      if (!endpoint) throw new Error("No backend endpoint is configured for this resource.");

      if (type === "update") {
        const id = data?.id;
        if (!id) throw new Error("Missing record id for update.");
        await apiFetch(`/${endpoint}/${id}`, undefined, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage(`${table} updated successfully.`);
      } else {
        await apiFetch(`/${endpoint}`, undefined, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage(`${table} saved successfully.`);
      }
      onSuccess?.();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Unable to save record.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">{type === "create" ? "Create" : "Update"} {table}</h1>
      <div className="flex flex-wrap gap-4">
        {tableFields.map((field) => (
          <label key={field.name} className="flex flex-col gap-2 w-full md:w-[calc(50%-0.5rem)] text-xs text-gray-500">
            {field.label}
            <input
              required={!(["description", "grade", "feedback", "classId", "publishedAt", "expiresAt"].includes(field.name))}
              type={field.type ?? "text"}
              value={values[field.name] ?? ""}
              onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-gray-800"
            />
          </label>
        ))}
        {table === "attendance" && (
          <label className="flex flex-col gap-2 w-full md:w-[calc(50%-0.5rem)] text-xs text-gray-500">
            Status
            <select value={String(values.status ?? "present")} onChange={(event) => setValues({ ...values, status: event.target.value })} className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-gray-800">
              <option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option>
            </select>
          </label>
        )}
      </div>
      {message && <p className="text-sm text-gray-600" role="status">{message}</p>}
      <button type="submit" disabled={submitting} className="bg-blue-400 text-white p-3 rounded-md disabled:opacity-60">
        {submitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
