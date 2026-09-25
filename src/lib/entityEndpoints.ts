// Maps a FormModal/EntityForm "table" name to its backend REST resource path.
export const endpointByTable: Record<string, string> = {
  teacher: "manage/teachers",
  student: "manage/students",
  parent: "manage/parents",
  assignment: "assignments",
  attendance: "attendance",
  class: "manage/classes",
  event: "manage/events",
  exam: "exams",
  lesson: "manage/lessons",
  result: "results",
  subject: "manage/subjects",
  announcement: "manage/announcements",
};

// Tables that support PATCH updates through EntityForm today. Other tables
// still show "not implemented" until their update flow is built.
export const updatableTables = new Set(["assignment", "lesson", "result", "announcement", "subject", "parent"]);
