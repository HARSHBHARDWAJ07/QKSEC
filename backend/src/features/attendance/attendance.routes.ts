import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parseBody, parseQuery } from "../../common/http/validation.js";
import { getAccessibleStudentIds, assertStudentAccess } from "../../common/services/studentAccess.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

const attendanceSchema = z.object({
  studentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  attendanceDate: z.string().date(),
  status: z.enum(["present", "absent", "late", "excused"]),
});

const bulkAttendanceSchema = z.object({
  lessonId: z.string().uuid(),
  attendanceDate: z.string().date(),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(["present", "absent", "late", "excused"]),
      }),
    )
    .min(1)
    .max(200),
});

const attendanceQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export async function attendanceRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const query = parseQuery(attendanceQuerySchema, request.query);
    const accessibleStudentIds = await getAccessibleStudentIds(request);

    if (query.studentId) await assertStudentAccess(request, query.studentId);
    if (accessibleStudentIds !== null && accessibleStudentIds.length === 0) return { data: [] };

    let attendanceQuery = supabaseAdmin
      .from("attendance_records")
      .select("id, student_id, lesson_id, attendance_date, status, marked_by, created_at, updated_at")
      .order("attendance_date", { ascending: false });

    if (query.studentId) {
      attendanceQuery = attendanceQuery.eq("student_id", query.studentId);
    } else if (accessibleStudentIds !== null) {
      attendanceQuery = attendanceQuery.in("student_id", accessibleStudentIds);
    }
    if (query.from) attendanceQuery = attendanceQuery.gte("attendance_date", query.from);
    if (query.to) attendanceQuery = attendanceQuery.lte("attendance_date", query.to);

    const { data, error } = await attendanceQuery;
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    return { data: data ?? [] };
  });

  app.post("/", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const body = parseBody(attendanceSchema, request.body);
    await assertStudentAccess(request, body.studentId);

    const { data, error } = await supabaseAdmin
      .from("attendance_records")
      .upsert({
        student_id: body.studentId,
        lesson_id: body.lessonId,
        attendance_date: body.attendanceDate,
        status: body.status,
        marked_by: request.user?.id,
      }, { onConflict: "student_id,lesson_id,attendance_date" })
      .select("*")
      .single();

    if (error) throw new AppError(500, "ATTENDANCE_UPSERT_FAILED", error.message);
    return reply.code(200).send({ data });
  });

  app.post("/bulk", {
    preHandler: [requireRoles("admin", "teacher")],
  }, async (request, reply) => {
    const body = parseBody(bulkAttendanceSchema, request.body);
    const accessibleStudentIds = await getAccessibleStudentIds(request);

    if (accessibleStudentIds !== null) {
      const unauthorized = body.records
        .map((r) => r.studentId)
        .filter((id) => !accessibleStudentIds.includes(id));
      if (unauthorized.length > 0) {
        throw new AppError(403, "FORBIDDEN", `Not authorized to mark attendance for ${unauthorized.length} student(s)`);
      }
    }

    const rows = body.records.map((r) => ({
      student_id: r.studentId,
      lesson_id: body.lessonId,
      attendance_date: body.attendanceDate,
      status: r.status,
      marked_by: request.user?.id,
    }));

    const { data, error } = await supabaseAdmin
      .from("attendance_records")
      .upsert(rows, { onConflict: "student_id,lesson_id,attendance_date" })
      .select("id, student_id, lesson_id, attendance_date, status, marked_by, created_at, updated_at");

    if (error) throw new AppError(500, "ATTENDANCE_BULK_FAILED", error.message);
    return reply.code(200).send({ data: data ?? [], meta: { count: (data ?? []).length } });
  });
}
