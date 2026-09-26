"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import type {
  AssignmentRecord,
  ClassRecord,
  ExamRecord,
  LessonRecord,
  StudentRecord,
  SubjectRecord,
  TeacherRecord,
} from "./api";

// Reference data used to turn foreign-key ids into names in list tables and
// to populate <select> inputs in forms. Most list endpoints return bare ids
// (e.g. an exam only carries lesson_id), so pages resolve them client-side.

export type GradeRecord = { id: string; level: number };
export type AcademicYearRecord = { id: string; name: string; is_current: boolean };

export type Lookups = {
  classes: ClassRecord[];
  lessons: LessonRecord[];
  subjects: SubjectRecord[];
  teachers: TeacherRecord[];
  students: StudentRecord[];
  exams: ExamRecord[];
  assignments: AssignmentRecord[];
  grades: GradeRecord[];
  academicYears: AcademicYearRecord[];
};

const EMPTY: Lookups = {
  classes: [], lessons: [], subjects: [], teachers: [], students: [],
  exams: [], assignments: [], grades: [], academicYears: [],
};

// Largest page the backend allows; the school's reference data fits in it.
const ALL = "?pageSize=100";

async function list<T>(path: string): Promise<T[]> {
  try {
    const response = await apiFetch<{ data: T[] }>(path);
    return response.data ?? [];
  } catch {
    // A role may not be allowed to list some resources (e.g. a student
    // listing teachers); fall back to an empty lookup instead of failing.
    return [];
  }
}

async function loadLookups(): Promise<Lookups> {
  const [classes, lessons, subjects, teachers, students, exams, assignments, grades, academicYears] = await Promise.all([
    list<ClassRecord>(`/classes${ALL}`),
    list<LessonRecord>(`/lessons${ALL}`),
    list<SubjectRecord>(`/subjects${ALL}`),
    list<TeacherRecord>(`/teachers${ALL}`),
    list<StudentRecord>(`/students${ALL}`),
    list<ExamRecord>(`/exams${ALL}`),
    list<AssignmentRecord>(`/assignments${ALL}`),
    list<GradeRecord>("/grades"),
    list<AcademicYearRecord>("/academic-years"),
  ]);
  return { classes, lessons, subjects, teachers, students, exams, assignments, grades, academicYears };
}

let cache: Promise<Lookups> | null = null;
const listeners = new Set<(lookups: Lookups) => void>();

function getLookups() {
  cache ??= loadLookups();
  return cache;
}

// Call after any create/update/delete so names and dropdowns stay current.
export function invalidateLookups() {
  cache = null;
  void getLookups().then((lookups) => listeners.forEach((listener) => listener(lookups)));
}

export function useLookups(): Lookups & { ready: boolean } {
  const [lookups, setLookups] = useState<Lookups>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const update = (next: Lookups) => {
      if (!active) return;
      setLookups(next);
      setReady(true);
    };
    listeners.add(update);
    void getLookups().then(update);
    return () => {
      active = false;
      listeners.delete(update);
    };
  }, []);

  return { ...lookups, ready };
}

// ── Name helpers ────────────────────────────────────────────────────────────

export function personName(profile: { first_name: string; last_name: string } | null | undefined, fallback = "-") {
  return profile ? `${profile.first_name} ${profile.last_name}`.trim() : fallback;
}

export function makeResolvers(lookups: Lookups) {
  const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]));
  const classes = byId(lookups.classes);
  const lessons = byId(lookups.lessons);
  const subjects = byId(lookups.subjects);
  const teachers = byId(lookups.teachers);
  const students = byId(lookups.students);
  const exams = byId(lookups.exams);
  const assignments = byId(lookups.assignments);
  const grades = byId(lookups.grades);

  const className = (id?: string | null) => (id ? classes.get(id)?.name ?? "-" : "-");
  const teacherName = (id?: string | null) => (id ? personName(teachers.get(id)?.profiles) : "-");
  const studentName = (id?: string | null) => (id ? personName(students.get(id)?.profiles) : "-");
  const subjectName = (id?: string | null) => (id ? subjects.get(id)?.name ?? "-" : "-");
  const lesson = (id?: string | null) => (id ? lessons.get(id) : undefined);

  return {
    className,
    teacherName,
    studentName,
    subjectName,
    lesson,
    lessonSubject: (id?: string | null) => lesson(id)?.subjects?.name ?? "-",
    lessonClass: (id?: string | null) => lesson(id)?.classes?.name ?? className(lesson(id)?.class_id),
    lessonTeacher: (id?: string | null) => teacherName(lesson(id)?.teacher_id),
    examTitle: (id?: string | null) => (id ? exams.get(id)?.title ?? "-" : "-"),
    exam: (id?: string | null) => (id ? exams.get(id) : undefined),
    assignment: (id?: string | null) => (id ? assignments.get(id) : undefined),
    gradeLevel: (id?: string | null) => (id ? grades.get(id)?.level : undefined),
    classGradeLevel: (classId?: string | null) => {
      const cls = classId ? classes.get(classId) : undefined;
      return cls?.grades?.level ?? (cls ? grades.get(cls.grade_id)?.level : undefined);
    },
    // A teacher's subjects/classes: explicit assignments plus what they teach in lessons.
    teacherSubjects: (teacherId: string) => unique([
      ...(teachers.get(teacherId)?.teacher_subjects ?? []).map((ts) => subjectName(ts.subject_id)),
      ...lookups.lessons.filter((l) => l.teacher_id === teacherId).map((l) => l.subjects?.name ?? subjectName(l.subject_id)),
    ]),
    teacherClasses: (teacherId: string) => unique([
      ...(teachers.get(teacherId)?.teacher_classes ?? []).map((tc) => className(tc.class_id)),
      ...lookups.lessons.filter((l) => l.teacher_id === teacherId).map((l) => l.classes?.name ?? className(l.class_id)),
    ]),
    subjectTeachers: (subjectId: string) => unique([
      ...lookups.teachers.filter((t) => t.teacher_subjects?.some((ts) => ts.subject_id === subjectId)).map((t) => personName(t.profiles)),
      ...lookups.lessons.filter((l) => l.subject_id === subjectId).map((l) => teacherName(l.teacher_id)),
    ]),
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => value && value !== "-"))];
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-";
}

export function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
}
