import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parseBody } from "../../common/http/validation.js";
import { defined } from "../../common/utils/objects.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { supabaseAdmin } from "../../config/supabase.js";

// ── Create schemas ────────────────────────────────────────────────────────────

const profileSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  dateOfBirth: z.string().date().optional(),
  sex: z.enum(["male", "female"]).optional(),
  bloodType: z.string().trim().optional(),
});

const classSchema = z.object({
  name: z.string().trim().min(1),
  capacity: z.coerce.number().int().positive(),
  academicYearId: z.string().uuid(),
  gradeId: z.string().uuid(),
  supervisorId: z.string().uuid().nullable().optional(),
});

const subjectSchema = z.object({ name: z.string().trim().min(1) });

const lessonSchema = z.object({
  name: z.string().trim().min(1),
  weekday: z.coerce.number().int().min(1).max(7),
  startTime: z.string(),
  endTime: z.string(),
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  teacherId: z.string().uuid(),
});

const eventSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    classId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.endsAt > v.startsAt, { path: ["endsAt"], message: "endsAt must be after startsAt" });

const announcementSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  publishedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  classIds: z.array(z.string().uuid()).optional(),
});

// ── Update schemas ────────────────────────────────────────────────────────────

const updateProfileFields = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  dateOfBirth: z.string().date().nullable().optional(),
  sex: z.enum(["male", "female"]).nullable().optional(),
  bloodType: z.string().trim().nullable().optional(),
});

const updateStudentSchema = updateProfileFields.extend({
  studentNumber: z.string().trim().min(1).optional(),
  classId: z.string().uuid().optional(),
  enrollmentDate: z.string().date().optional(),
  active: z.boolean().optional(),
});

const updateTeacherSchema = updateProfileFields.extend({
  employeeNumber: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

const updateParentSchema = updateProfileFields.extend({
  active: z.boolean().optional(),
});

const updateClassSchema = z.object({
  name: z.string().trim().min(1).optional(),
  capacity: z.coerce.number().int().positive().optional(),
  academicYearId: z.string().uuid().optional(),
  gradeId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
});

const updateSubjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
});

const updateLessonSchema = z.object({
  name: z.string().trim().min(1).optional(),
  weekday: z.coerce.number().int().min(1).max(7).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  subjectId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
});

const updateEventSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  classId: z.string().uuid().nullable().optional(),
});

const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(1).optional(),
  body: z.string().trim().min(1).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

const academicYearSchema = z
  .object({
    name: z.string().trim().min(1),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
  })
  .refine((v) => v.endsOn > v.startsOn, { path: ["endsOn"], message: "endsOn must be after startsOn" });

const updateAcademicYearSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    startsOn: z.string().date().optional(),
    endsOn: z.string().date().optional(),
  })
  .refine(
    (v) => !(v.startsOn && v.endsOn) || v.endsOn > v.startsOn,
    { path: ["endsOn"], message: "endsOn must be after startsOn" },
  );

const gradeSchema = z.object({
  level: z.number().int().positive(),
});

const updateGradeSchema = z.object({
  level: z.number().int().positive().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createProfile(
  payload: z.infer<typeof profileSchema>,
  role: "student" | "teacher" | "parent",
) {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    throw new AppError(400, "USER_CREATE_FAILED", authError?.message ?? "Unable to create user");
  }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: authData.user.id,
      role,
      first_name: payload.firstName,
      last_name: payload.lastName,
      phone: payload.phone ?? null,
      address: payload.address ?? null,
      date_of_birth: payload.dateOfBirth ?? null,
      sex: payload.sex ?? null,
      blood_type: payload.bloodType ?? null,
    })
    .select("*")
    .single();
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new AppError(400, "PROFILE_CREATE_FAILED", profileError.message);
  }
  return { authUser: authData.user, profile };
}


const PROFILE_SELECT = "id, first_name, last_name, phone, address, avatar_path, blood_type, sex, date_of_birth";

// ── Routes ────────────────────────────────────────────────────────────────────

export async function managementRoutes(app: FastifyInstance) {
  const adminOnly = [requireRoles("admin")];

  // ── STUDENTS ──────────────────────────────────────────────────────────────

  app.post("/students", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(
      profileSchema.extend({
        studentNumber: z.string().trim().min(1),
        classId: z.string().uuid(),
        enrollmentDate: z.string().date().optional(),
      }),
      request.body,
    );

    // Enforce class capacity before creating the auth user.
    const { data: cls, error: clsError } = await supabaseAdmin
      .from("classes").select("capacity").eq("id", body.classId).maybeSingle();
    if (clsError) throw new AppError(500, "FETCH_FAILED", clsError.message);
    if (!cls) throw new AppError(404, "CLASS_NOT_FOUND", "Class not found");

    const { count, error: countError } = await supabaseAdmin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", body.classId)
      .eq("active", true);
    if (countError) throw new AppError(500, "FETCH_FAILED", countError.message);
    if ((count ?? 0) >= cls.capacity) {
      throw new AppError(409, "CLASS_FULL", `Class has reached its capacity of ${cls.capacity} student(s)`);
    }

    const created = await createProfile(body, "student");
    const { data, error } = await supabaseAdmin
      .from("students")
      .insert({
        profile_id: created.profile.id,
        student_number: body.studentNumber,
        class_id: body.classId,
        enrollment_date: body.enrollmentDate,
      })
      .select("*")
      .single();
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.authUser.id);
      throw new AppError(400, "STUDENT_CREATE_FAILED", error.message);
    }
    return reply.code(201).send({ data: { ...data, profile: created.profile } });
  });

  app.patch("/students/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateStudentSchema, request.body);

    const { data: student, error: fetchError } = await supabaseAdmin
      .from("students")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student not found");

    const profileUpdates = defined({
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone,
      address: body.address,
      date_of_birth: body.dateOfBirth,
      sex: body.sex,
      blood_type: body.bloodType,
    });
    const studentUpdates = defined({
      student_number: body.studentNumber,
      class_id: body.classId,
      enrollment_date: body.enrollmentDate,
      active: body.active,
    });

    if (Object.keys(profileUpdates).length === 0 && Object.keys(studentUpdates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", student.profile_id);
      if (error) throw new AppError(400, "PROFILE_UPDATE_FAILED", error.message);
    }

    if (Object.keys(studentUpdates).length > 0) {
      const { error } = await supabaseAdmin.from("students").update(studentUpdates).eq("id", id);
      if (error) throw new AppError(400, "STUDENT_UPDATE_FAILED", error.message);
    }

    const { data, error } = await supabaseAdmin
      .from("students")
      .select(`*, profiles!profile_id(${PROFILE_SELECT})`)
      .eq("id", id)
      .single();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/students/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: student, error: fetchError } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student not found");

    const { error } = await supabaseAdmin.from("students").update({ active: false }).eq("id", id);
    if (error) throw new AppError(400, "STUDENT_DEACTIVATE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── TEACHERS ──────────────────────────────────────────────────────────────

  app.post("/teachers", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(
      profileSchema.extend({ employeeNumber: z.string().trim().min(1) }),
      request.body,
    );
    const created = await createProfile(body, "teacher");
    const { data, error } = await supabaseAdmin
      .from("teachers")
      .insert({ profile_id: created.profile.id, employee_number: body.employeeNumber })
      .select("*")
      .single();
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.authUser.id);
      throw new AppError(400, "TEACHER_CREATE_FAILED", error.message);
    }
    return reply.code(201).send({ data: { ...data, profile: created.profile } });
  });

  app.patch("/teachers/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateTeacherSchema, request.body);

    const { data: teacher, error: fetchError } = await supabaseAdmin
      .from("teachers")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!teacher) throw new AppError(404, "TEACHER_NOT_FOUND", "Teacher not found");

    const profileUpdates = defined({
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone,
      address: body.address,
      date_of_birth: body.dateOfBirth,
      sex: body.sex,
      blood_type: body.bloodType,
    });
    const teacherUpdates = defined({ employee_number: body.employeeNumber, active: body.active });

    if (Object.keys(profileUpdates).length === 0 && Object.keys(teacherUpdates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", teacher.profile_id);
      if (error) throw new AppError(400, "PROFILE_UPDATE_FAILED", error.message);
    }

    if (Object.keys(teacherUpdates).length > 0) {
      const { error } = await supabaseAdmin.from("teachers").update(teacherUpdates).eq("id", id);
      if (error) throw new AppError(400, "TEACHER_UPDATE_FAILED", error.message);
    }

    const { data, error } = await supabaseAdmin
      .from("teachers")
      .select(`*, profiles!profile_id(${PROFILE_SELECT})`)
      .eq("id", id)
      .single();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/teachers/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: teacher, error: fetchError } = await supabaseAdmin
      .from("teachers")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!teacher) throw new AppError(404, "TEACHER_NOT_FOUND", "Teacher not found");

    const { error } = await supabaseAdmin.from("teachers").update({ active: false }).eq("id", id);
    if (error) throw new AppError(400, "TEACHER_DEACTIVATE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── PARENTS ───────────────────────────────────────────────────────────────

  app.post("/parents", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(profileSchema, request.body);
    const created = await createProfile(body, "parent");
    const { data, error } = await supabaseAdmin
      .from("parents")
      .insert({ profile_id: created.profile.id })
      .select("*")
      .single();
    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(created.authUser.id);
      throw new AppError(400, "PARENT_CREATE_FAILED", error.message);
    }
    return reply.code(201).send({ data: { ...data, profile: created.profile } });
  });

  app.patch("/parents/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateParentSchema, request.body);

    const { data: parent, error: fetchError } = await supabaseAdmin
      .from("parents")
      .select("id, profile_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!parent) throw new AppError(404, "PARENT_NOT_FOUND", "Parent not found");

    const profileUpdates = defined({
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone,
      address: body.address,
      date_of_birth: body.dateOfBirth,
      sex: body.sex,
      blood_type: body.bloodType,
    });
    const parentUpdates = defined({ active: body.active });

    if (Object.keys(profileUpdates).length === 0 && Object.keys(parentUpdates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", parent.profile_id);
      if (error) throw new AppError(400, "PROFILE_UPDATE_FAILED", error.message);
    }

    if (Object.keys(parentUpdates).length > 0) {
      const { error } = await supabaseAdmin.from("parents").update(parentUpdates).eq("id", id);
      if (error) throw new AppError(400, "PARENT_UPDATE_FAILED", error.message);
    }

    const { data, error } = await supabaseAdmin
      .from("parents")
      .select(`*, profiles!profile_id(${PROFILE_SELECT})`)
      .eq("id", id)
      .single();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/parents/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: parent, error: fetchError } = await supabaseAdmin
      .from("parents")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!parent) throw new AppError(404, "PARENT_NOT_FOUND", "Parent not found");

    const { error } = await supabaseAdmin.from("parents").update({ active: false }).eq("id", id);
    if (error) throw new AppError(400, "PARENT_DEACTIVATE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── CLASSES ───────────────────────────────────────────────────────────────

  app.post("/classes", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(classSchema, request.body);
    const { data, error } = await supabaseAdmin
      .from("classes")
      .insert({
        academic_year_id: body.academicYearId,
        grade_id: body.gradeId,
        name: body.name,
        capacity: body.capacity,
        supervisor_id: body.supervisorId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new AppError(400, "CLASS_CREATE_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/classes/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateClassSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "CLASS_NOT_FOUND", "Class not found");

    const updates = defined({
      name: body.name,
      capacity: body.capacity,
      academic_year_id: body.academicYearId,
      grade_id: body.gradeId,
      supervisor_id: body.supervisorId,
    });
    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("classes")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError(400, "CLASS_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/classes/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "CLASS_NOT_FOUND", "Class not found");

    const { count, error: countError } = await supabaseAdmin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", id)
      .eq("active", true);
    if (countError) throw new AppError(500, "FETCH_FAILED", countError.message);
    if (count && count > 0) {
      throw new AppError(
        409,
        "CLASS_HAS_STUDENTS",
        `Cannot delete class with ${count} active student(s). Reassign or deactivate students first.`,
      );
    }

    const { error } = await supabaseAdmin.from("classes").delete().eq("id", id);
    if (error) throw new AppError(400, "CLASS_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── SUBJECTS ──────────────────────────────────────────────────────────────

  app.post("/subjects", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(subjectSchema, request.body);
    const { data, error } = await supabaseAdmin.from("subjects").insert(body).select("*").single();
    if (error) throw new AppError(400, "SUBJECT_CREATE_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/subjects/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateSubjectSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "SUBJECT_NOT_FOUND", "Subject not found");

    const updates = defined({ name: body.name });
    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("subjects")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError(400, "SUBJECT_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/subjects/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("subjects")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "SUBJECT_NOT_FOUND", "Subject not found");

    const { error } = await supabaseAdmin.from("subjects").delete().eq("id", id);
    if (error) throw new AppError(400, "SUBJECT_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── LESSONS ───────────────────────────────────────────────────────────────

  app.post("/lessons", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(lessonSchema, request.body);
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .insert({
        name: body.name,
        weekday: body.weekday,
        start_time: body.startTime,
        end_time: body.endTime,
        subject_id: body.subjectId,
        class_id: body.classId,
        teacher_id: body.teacherId,
      })
      .select("*")
      .single();
    if (error) throw new AppError(400, "LESSON_CREATE_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/lessons/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateLessonSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "LESSON_NOT_FOUND", "Lesson not found");

    const updates = defined({
      name: body.name,
      weekday: body.weekday,
      start_time: body.startTime,
      end_time: body.endTime,
      subject_id: body.subjectId,
      class_id: body.classId,
      teacher_id: body.teacherId,
    });
    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("lessons")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError(400, "LESSON_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/lessons/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("lessons")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "LESSON_NOT_FOUND", "Lesson not found");

    const { error } = await supabaseAdmin.from("lessons").delete().eq("id", id);
    if (error) throw new AppError(400, "LESSON_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── EVENTS ────────────────────────────────────────────────────────────────

  app.post("/events", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(eventSchema, request.body);
    const { data, error } = await supabaseAdmin
      .from("events")
      .insert({
        title: body.title,
        description: body.description ?? null,
        starts_at: body.startsAt,
        ends_at: body.endsAt,
        class_id: body.classId ?? null,
        created_by: request.user?.id,
      })
      .select("*")
      .single();
    if (error) throw new AppError(400, "EVENT_CREATE_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/events/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateEventSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "EVENT_NOT_FOUND", "Event not found");

    const updates = defined({
      title: body.title,
      description: body.description,
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      class_id: body.classId,
    });
    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError(400, "EVENT_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/events/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "EVENT_NOT_FOUND", "Event not found");

    const { error } = await supabaseAdmin.from("events").delete().eq("id", id);
    if (error) throw new AppError(400, "EVENT_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

  app.post("/announcements", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(announcementSchema, request.body);
    const { data, error } = await supabaseAdmin
      .from("announcements")
      .insert({
        title: body.title,
        body: body.body,
        published_at: body.publishedAt ?? null,
        expires_at: body.expiresAt ?? null,
        published_by: request.user?.id,
      })
      .select("*")
      .single();
    if (error) throw new AppError(400, "ANNOUNCEMENT_CREATE_FAILED", error.message);

    if (body.classIds && body.classIds.length > 0) {
      const { error: classError } = await supabaseAdmin
        .from("announcement_classes")
        .insert(body.classIds.map((classId) => ({ announcement_id: data.id, class_id: classId })));
      if (classError) {
        await supabaseAdmin.from("announcements").delete().eq("id", data.id);
        throw new AppError(400, "ANNOUNCEMENT_CLASS_LINK_FAILED", classError.message);
      }
    }

    return reply.code(201).send({ data });
  });

  app.patch("/announcements/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateAnnouncementSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("announcements")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found");

    const updates = defined({
      title: body.title,
      body: body.body,
      published_at: body.publishedAt,
      expires_at: body.expiresAt,
    });
    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("announcements")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError(400, "ANNOUNCEMENT_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/announcements/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("announcements")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found");

    const { error } = await supabaseAdmin.from("announcements").delete().eq("id", id);
    if (error) throw new AppError(400, "ANNOUNCEMENT_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── ACADEMIC YEARS ────────────────────────────────────────────────────────

  app.post("/academic-years", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(academicYearSchema, request.body);
    const { data, error } = await supabaseAdmin
      .from("academic_years")
      .insert({ name: body.name, starts_on: body.startsOn, ends_on: body.endsOn })
      .select("id, name, starts_on, ends_on, is_current, created_at")
      .single();
    if (error) throw new AppError(400, "ACADEMIC_YEAR_CREATE_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/academic-years/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateAcademicYearSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("academic_years")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "ACADEMIC_YEAR_NOT_FOUND", "Academic year not found");

    const updates = defined({ name: body.name, starts_on: body.startsOn, ends_on: body.endsOn });
    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("academic_years")
      .update(updates)
      .eq("id", id)
      .select("id, name, starts_on, ends_on, is_current, created_at")
      .single();
    if (error) throw new AppError(400, "ACADEMIC_YEAR_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  // Sets this year as current. Uses a Postgres RPC so both the clear and the set happen in
  // one transaction — avoids the brief window the two-step approach creates.
  // The RPC must exist in Supabase: CREATE OR REPLACE FUNCTION set_current_academic_year(year_id uuid)
  // RETURNS academic_years LANGUAGE plpgsql AS $$
  // BEGIN
  //   UPDATE academic_years SET is_current = false WHERE is_current = true;
  //   UPDATE academic_years SET is_current = true WHERE id = year_id;
  //   RETURN (SELECT * FROM academic_years WHERE id = year_id);
  // END; $$;
  app.patch("/academic-years/:id/set-current", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("academic_years")
      .select("id, is_current")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "ACADEMIC_YEAR_NOT_FOUND", "Academic year not found");
    if (existing.is_current) {
      const { data: current } = await supabaseAdmin
        .from("academic_years")
        .select("id, name, starts_on, ends_on, is_current, created_at")
        .eq("id", id)
        .single();
      return reply.send({ data: current, message: "Already the current academic year" });
    }

    const { data, error } = await supabaseAdmin.rpc("set_current_academic_year", { year_id: id });
    if (error) {
      // RPC not yet created — fall back to two-step with compensating rollback
      const { error: clearError } = await supabaseAdmin
        .from("academic_years")
        .update({ is_current: false })
        .eq("is_current", true);
      if (clearError) throw new AppError(500, "ACADEMIC_YEAR_UPDATE_FAILED", clearError.message);

      const { data: updated, error: setError } = await supabaseAdmin
        .from("academic_years")
        .update({ is_current: true })
        .eq("id", id)
        .select("id, name, starts_on, ends_on, is_current, created_at")
        .single();
      if (setError) {
        // Attempt to restore whichever year was current before — best-effort only
        await supabaseAdmin.from("academic_years").update({ is_current: true }).eq("id", existing.id);
        throw new AppError(400, "ACADEMIC_YEAR_UPDATE_FAILED", setError.message);
      }
      return reply.send({ data: updated });
    }

    return reply.send({ data });
  });

  app.delete("/academic-years/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("academic_years")
      .select("id, is_current")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "ACADEMIC_YEAR_NOT_FOUND", "Academic year not found");
    if (existing.is_current) {
      throw new AppError(409, "ACADEMIC_YEAR_IS_CURRENT", "Cannot delete the active academic year. Set another year as current first.");
    }

    const { count, error: countError } = await supabaseAdmin
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("academic_year_id", id);
    if (countError) throw new AppError(500, "FETCH_FAILED", countError.message);
    if (count && count > 0) {
      throw new AppError(
        409,
        "ACADEMIC_YEAR_HAS_CLASSES",
        `Cannot delete academic year with ${count} class(es) assigned to it.`,
      );
    }

    const { error } = await supabaseAdmin.from("academic_years").delete().eq("id", id);
    if (error) throw new AppError(400, "ACADEMIC_YEAR_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── GRADES ────────────────────────────────────────────────────────────────

  app.post("/grades", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(gradeSchema, request.body);
    const { data, error } = await supabaseAdmin
      .from("grades")
      .insert({ level: body.level })
      .select("id, level, created_at")
      .single();
    if (error) throw new AppError(400, "GRADE_CREATE_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/grades/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(updateGradeSchema, request.body);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("grades")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "GRADE_NOT_FOUND", "Grade not found");

    if (body.level === undefined) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("grades")
      .update({ level: body.level })
      .eq("id", id)
      .select("id, level, created_at")
      .single();
    if (error) throw new AppError(400, "GRADE_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  app.delete("/grades/:id", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("grades")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!existing) throw new AppError(404, "GRADE_NOT_FOUND", "Grade not found");

    const { count, error: countError } = await supabaseAdmin
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("grade_id", id);
    if (countError) throw new AppError(500, "FETCH_FAILED", countError.message);
    if (count && count > 0) {
      throw new AppError(
        409,
        "GRADE_HAS_CLASSES",
        `Cannot delete grade with ${count} class(es) assigned to it.`,
      );
    }

    const { error } = await supabaseAdmin.from("grades").delete().eq("id", id);
    if (error) throw new AppError(400, "GRADE_DELETE_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── TEACHER ↔ SUBJECTS ────────────────────────────────────────────────────

  app.post("/teachers/:id/subjects", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(z.object({ subjectIds: z.array(z.string().uuid()).min(1) }), request.body);

    const { data: teacher, error: fetchError } = await supabaseAdmin
      .from("teachers").select("id").eq("id", id).maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!teacher) throw new AppError(404, "TEACHER_NOT_FOUND", "Teacher not found");

    const { error } = await supabaseAdmin
      .from("teacher_subjects")
      .upsert(
        body.subjectIds.map((subjectId) => ({ teacher_id: id, subject_id: subjectId })),
        { onConflict: "teacher_id,subject_id", ignoreDuplicates: true },
      );
    if (error) throw new AppError(400, "TEACHER_SUBJECT_LINK_FAILED", error.message);

    const { data, error: listError } = await supabaseAdmin
      .from("teacher_subjects")
      .select("subjects!subject_id (id, name, created_at)")
      .eq("teacher_id", id);
    if (listError) throw new AppError(500, "FETCH_FAILED", listError.message);
    return reply.code(201).send({ data: (data ?? []).map((r) => r.subjects) });
  });

  app.delete("/teachers/:id/subjects/:subjectId", { preHandler: adminOnly }, async (request, reply) => {
    const { id, subjectId } = request.params as { id: string; subjectId: string };

    const { data: link, error: fetchError } = await supabaseAdmin
      .from("teacher_subjects")
      .select("teacher_id")
      .eq("teacher_id", id)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!link) throw new AppError(404, "LINK_NOT_FOUND", "This teacher is not assigned to that subject");

    const { error } = await supabaseAdmin
      .from("teacher_subjects")
      .delete()
      .eq("teacher_id", id)
      .eq("subject_id", subjectId);
    if (error) throw new AppError(400, "TEACHER_SUBJECT_UNLINK_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── TEACHER ↔ CLASSES ─────────────────────────────────────────────────────

  app.post("/teachers/:id/classes", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(z.object({ classIds: z.array(z.string().uuid()).min(1) }), request.body);

    const { data: teacher, error: fetchError } = await supabaseAdmin
      .from("teachers").select("id").eq("id", id).maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!teacher) throw new AppError(404, "TEACHER_NOT_FOUND", "Teacher not found");

    const { error } = await supabaseAdmin
      .from("teacher_classes")
      .upsert(
        body.classIds.map((classId) => ({ teacher_id: id, class_id: classId })),
        { onConflict: "teacher_id,class_id", ignoreDuplicates: true },
      );
    if (error) throw new AppError(400, "TEACHER_CLASS_LINK_FAILED", error.message);

    const { data, error: listError } = await supabaseAdmin
      .from("teacher_classes")
      .select("classes!class_id (id, name, capacity, academic_years!academic_year_id (id, name, is_current), grades!grade_id (id, level))")
      .eq("teacher_id", id);
    if (listError) throw new AppError(500, "FETCH_FAILED", listError.message);
    return reply.code(201).send({ data: (data ?? []).map((r) => r.classes) });
  });

  app.delete("/teachers/:id/classes/:classId", { preHandler: adminOnly }, async (request, reply) => {
    const { id, classId } = request.params as { id: string; classId: string };

    const { data: link, error: fetchError } = await supabaseAdmin
      .from("teacher_classes")
      .select("teacher_id")
      .eq("teacher_id", id)
      .eq("class_id", classId)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!link) throw new AppError(404, "LINK_NOT_FOUND", "This teacher is not assigned to that class");

    const { error } = await supabaseAdmin
      .from("teacher_classes")
      .delete()
      .eq("teacher_id", id)
      .eq("class_id", classId);
    if (error) throw new AppError(400, "TEACHER_CLASS_UNLINK_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── PARENT ↔ STUDENTS ─────────────────────────────────────────────────────

  app.post("/parents/:id/students", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(
      z.object({
        studentId: z.string().uuid(),
        relationship: z.string().trim().min(1).optional(),
        isPrimary: z.boolean().optional(),
      }),
      request.body,
    );

    const { data: parent, error: parentError } = await supabaseAdmin
      .from("parents").select("id").eq("id", id).maybeSingle();
    if (parentError) throw new AppError(500, "FETCH_FAILED", parentError.message);
    if (!parent) throw new AppError(404, "PARENT_NOT_FOUND", "Parent not found");

    const { data: student, error: studentError } = await supabaseAdmin
      .from("students").select("id").eq("id", body.studentId).maybeSingle();
    if (studentError) throw new AppError(500, "FETCH_FAILED", studentError.message);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student not found");

    const { data, error } = await supabaseAdmin
      .from("parent_students")
      .upsert(
        {
          parent_id: id,
          student_id: body.studentId,
          relationship: body.relationship ?? "parent",
          is_primary: body.isPrimary ?? false,
        },
        { onConflict: "parent_id,student_id" },
      )
      .select("parent_id, student_id, relationship, is_primary")
      .single();
    if (error) throw new AppError(400, "PARENT_STUDENT_LINK_FAILED", error.message);
    return reply.code(201).send({ data });
  });

  app.delete("/parents/:id/students/:studentId", { preHandler: adminOnly }, async (request, reply) => {
    const { id, studentId } = request.params as { id: string; studentId: string };

    const { data: link, error: fetchError } = await supabaseAdmin
      .from("parent_students")
      .select("parent_id")
      .eq("parent_id", id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!link) throw new AppError(404, "LINK_NOT_FOUND", "This parent is not linked to that student");

    const { error } = await supabaseAdmin
      .from("parent_students")
      .delete()
      .eq("parent_id", id)
      .eq("student_id", studentId);
    if (error) throw new AppError(400, "PARENT_STUDENT_UNLINK_FAILED", error.message);
    return reply.code(204).send();
  });

  // ── ANNOUNCEMENT ↔ CLASSES ────────────────────────────────────────────────

  app.post("/announcements/:id/classes", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = parseBody(z.object({ classIds: z.array(z.string().uuid()).min(1) }), request.body);

    const { data: announcement, error: fetchError } = await supabaseAdmin
      .from("announcements").select("id").eq("id", id).maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!announcement) throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found");

    const { error } = await supabaseAdmin
      .from("announcement_classes")
      .upsert(
        body.classIds.map((classId) => ({ announcement_id: id, class_id: classId })),
        { onConflict: "announcement_id,class_id", ignoreDuplicates: true },
      );
    if (error) throw new AppError(400, "ANNOUNCEMENT_CLASS_LINK_FAILED", error.message);

    const { data, error: listError } = await supabaseAdmin
      .from("announcement_classes")
      .select("classes!class_id (id, name)")
      .eq("announcement_id", id);
    if (listError) throw new AppError(500, "FETCH_FAILED", listError.message);
    return reply.code(201).send({ data: (data ?? []).map((r) => r.classes) });
  });

  app.delete("/announcements/:id/classes/:classId", { preHandler: adminOnly }, async (request, reply) => {
    const { id, classId } = request.params as { id: string; classId: string };

    const { data: link, error: fetchError } = await supabaseAdmin
      .from("announcement_classes")
      .select("announcement_id")
      .eq("announcement_id", id)
      .eq("class_id", classId)
      .maybeSingle();
    if (fetchError) throw new AppError(500, "FETCH_FAILED", fetchError.message);
    if (!link) throw new AppError(404, "LINK_NOT_FOUND", "This announcement is not targeted at that class");

    const { error } = await supabaseAdmin
      .from("announcement_classes")
      .delete()
      .eq("announcement_id", id)
      .eq("class_id", classId);
    if (error) throw new AppError(400, "ANNOUNCEMENT_CLASS_UNLINK_FAILED", error.message);
    return reply.code(204).send();
  });
}
