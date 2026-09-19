import type { FastifyInstance } from "fastify";
import { AppError } from "../../common/errors/AppError.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

function computeAttendanceRate(records: { status: string }[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((r) => r.status === "present").length;
  return Math.round((present / records.length) * 100);
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/summary", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const role = request.profile?.role;
    const userId = request.user?.id;
    const now = new Date();
    const nowIso = now.toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // ── Admin ────────────────────────────────────────────────────
    if (role === "admin") {
      const [students, teachers, classes, subjects, attendance, events] = await Promise.all([
        supabaseAdmin.from("students").select("id", { count: "exact", head: true }).eq("active", true),
        supabaseAdmin.from("teachers").select("id", { count: "exact", head: true }).eq("active", true),
        supabaseAdmin.from("classes").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("subjects").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("attendance_records").select("status").gte("attendance_date", thirtyDaysAgo),
        supabaseAdmin
          .from("events")
          .select("id, title, starts_at, ends_at, class_id")
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(5),
      ]);
      if (attendance.error) throw new AppError(500, "FETCH_FAILED", attendance.error.message);
      if (events.error) throw new AppError(500, "FETCH_FAILED", events.error.message);

      return {
        role: "admin",
        metrics: {
          activeStudents: students.count ?? 0,
          activeTeachers: teachers.count ?? 0,
          classes: classes.count ?? 0,
          subjects: subjects.count ?? 0,
          schoolAttendanceRate: computeAttendanceRate(attendance.data ?? []),
        },
        upcomingEvents: events.data ?? [],
      };
    }

    // ── Teacher ──────────────────────────────────────────────────
    if (role === "teacher") {
      const { data: teacher, error: teacherError } = await supabaseAdmin
        .from("teachers")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();
      if (teacherError) throw new AppError(500, "FETCH_FAILED", teacherError.message);
      if (!teacher) throw new AppError(404, "TEACHER_NOT_FOUND", "Teacher record not found");

      const [classLinks, lessonRows] = await Promise.all([
        supabaseAdmin
          .from("teacher_classes")
          .select("classes!class_id (id, name, grades!grade_id (id, level))")
          .eq("teacher_id", teacher.id),
        supabaseAdmin
          .from("lessons")
          .select("id")
          .eq("teacher_id", teacher.id),
      ]);
      if (classLinks.error) throw new AppError(500, "FETCH_FAILED", classLinks.error.message);
      if (lessonRows.error) throw new AppError(500, "FETCH_FAILED", lessonRows.error.message);

      const lessonIds = (lessonRows.data ?? []).map((l) => l.id);

      const [exams, results] = await Promise.all([
        lessonIds.length > 0
          ? supabaseAdmin
              .from("exams")
              .select("id, title, starts_at, ends_at, lesson_id")
              .in("lesson_id", lessonIds)
              .gte("starts_at", nowIso)
              .lte("starts_at", fourteenDaysAhead)
              .order("starts_at", { ascending: true })
              .limit(10)
          : Promise.resolve({ data: [] as { id: string; title: string; starts_at: string; ends_at: string; lesson_id: string }[], error: null }),
        supabaseAdmin
          .from("results")
          .select("id, student_id, score, grade, published_at, created_at")
          .eq("created_by", userId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      if (exams.error) throw new AppError(500, "FETCH_FAILED", exams.error.message);
      if (results.error) throw new AppError(500, "FETCH_FAILED", results.error.message);

      return {
        role: "teacher",
        classes: (classLinks.data ?? []).map((l) => l.classes),
        upcomingExams: exams.data ?? [],
        recentResults: results.data ?? [],
      };
    }

    // ── Student ──────────────────────────────────────────────────
    if (role === "student") {
      const { data: student, error: studentError } = await supabaseAdmin
        .from("students")
        .select("id, class_id")
        .eq("profile_id", userId)
        .maybeSingle();
      if (studentError) throw new AppError(500, "FETCH_FAILED", studentError.message);
      if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");

      const { data: lessonRows, error: lessonError } = student.class_id
        ? await supabaseAdmin.from("lessons").select("id").eq("class_id", student.class_id)
        : { data: [], error: null };
      if (lessonError) throw new AppError(500, "FETCH_FAILED", lessonError.message);
      const lessonIds = (lessonRows ?? []).map((l) => l.id);

      const [attendance, exams, results] = await Promise.all([
        supabaseAdmin
          .from("attendance_records")
          .select("status")
          .eq("student_id", student.id)
          .gte("attendance_date", thirtyDaysAgo),
        lessonIds.length > 0
          ? supabaseAdmin
              .from("exams")
              .select("id, title, starts_at, ends_at, lesson_id")
              .in("lesson_id", lessonIds)
              .gte("starts_at", nowIso)
              .lte("starts_at", fourteenDaysAhead)
              .order("starts_at", { ascending: true })
              .limit(5)
          : Promise.resolve({ data: [] as { id: string; title: string; starts_at: string; ends_at: string; lesson_id: string }[], error: null }),
        supabaseAdmin
          .from("results")
          .select("id, exam_id, assignment_id, score, grade, feedback, published_at, created_at")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      if (attendance.error) throw new AppError(500, "FETCH_FAILED", attendance.error.message);
      if (exams.error) throw new AppError(500, "FETCH_FAILED", exams.error.message);
      if (results.error) throw new AppError(500, "FETCH_FAILED", results.error.message);

      return {
        role: "student",
        attendanceRate: computeAttendanceRate(attendance.data ?? []),
        upcomingExams: exams.data ?? [],
        recentResults: results.data ?? [],
      };
    }

    // ── Parent ───────────────────────────────────────────────────
    if (role === "parent") {
      const { data: parent, error: parentError } = await supabaseAdmin
        .from("parents")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();
      if (parentError) throw new AppError(500, "FETCH_FAILED", parentError.message);
      if (!parent) throw new AppError(404, "PARENT_NOT_FOUND", "Parent record not found");

      const { data: childLinks, error: childError } = await supabaseAdmin
        .from("parent_students")
        .select(`
          relationship, is_primary,
          students!student_id (
            id, student_number,
            profiles!profile_id (id, first_name, last_name, avatar_path),
            classes!class_id (id, name)
          )
        `)
        .eq("parent_id", parent.id);
      if (childError) throw new AppError(500, "FETCH_FAILED", childError.message);

      type ChildRow = { id: string; student_number: string; profiles: unknown; classes: unknown } | null;
      const children = (childLinks ?? []).map((l) => l.students as unknown as ChildRow);

      const childData = await Promise.all(
        children
          .filter((c): c is NonNullable<ChildRow> => c !== null)
          .map(async (child) => {
            const [attendance, results] = await Promise.all([
              supabaseAdmin
                .from("attendance_records")
                .select("status")
                .eq("student_id", child.id)
                .gte("attendance_date", thirtyDaysAgo),
              supabaseAdmin
                .from("results")
                .select("id, exam_id, assignment_id, score, grade, published_at, created_at")
                .eq("student_id", child.id)
                .order("created_at", { ascending: false })
                .limit(3),
            ]);
            return {
              student: child,
              attendanceRate: computeAttendanceRate(attendance.data ?? []),
              recentResults: results.data ?? [],
            };
          }),
      );

      return { role: "parent", children: childData };
    }

    return { role };
  });
}
