import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError.js";
import { supabaseAdmin } from "../../config/supabase.js";

export async function getAccessibleStudentIds(request: FastifyRequest): Promise<string[] | null> {
  const role = request.profile?.role;
  const userId = request.user?.id;

  if (!role || !userId) {
    throw new AppError(401, "UNAUTHORIZED", "Authenticated user context is required");
  }

  if (role === "admin") return null;

  if (role === "student") {
    const { data, error } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    if (error) throw new AppError(500, "STUDENT_QUERY_FAILED", "Unable to resolve student access");
    return data ? [data.id] : [];
  }

  if (role === "parent") {
    const { data: parent, error: parentError } = await supabaseAdmin
      .from("parents")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    if (parentError) throw new AppError(500, "PARENT_QUERY_FAILED", "Unable to resolve parent access");
    if (!parent) return [];

    const { data, error } = await supabaseAdmin
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", parent.id);

    if (error) throw new AppError(500, "PARENT_STUDENTS_QUERY_FAILED", "Unable to resolve linked students");
    return (data ?? []).map((item) => item.student_id);
  }

  const { data: teacher, error: teacherError } = await supabaseAdmin
    .from("teachers")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (teacherError) throw new AppError(500, "TEACHER_QUERY_FAILED", "Unable to resolve teacher access");
  if (!teacher) return [];

  const { data: teacherClasses, error: classesError } = await supabaseAdmin
    .from("teacher_classes")
    .select("class_id")
    .eq("teacher_id", teacher.id);

  if (classesError) throw new AppError(500, "TEACHER_CLASSES_QUERY_FAILED", "Unable to resolve teacher classes");

  const classIds = (teacherClasses ?? []).map((item) => item.class_id);
  if (classIds.length === 0) return [];

  const { data: students, error: studentsError } = await supabaseAdmin
    .from("students")
    .select("id")
    .in("class_id", classIds);

  if (studentsError) throw new AppError(500, "STUDENT_QUERY_FAILED", "Unable to resolve teacher students");
  return (students ?? []).map((item) => item.id);
}

export async function assertStudentAccess(request: FastifyRequest, studentId: string) {
  const accessibleIds = await getAccessibleStudentIds(request);
  if (accessibleIds !== null && !accessibleIds.includes(studentId)) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this student");
  }
}

// Returns null for admin/teacher (no filter), or lesson IDs within the user's accessible classes.
export async function getAccessibleLessonIds(request: FastifyRequest): Promise<string[] | null> {
  const classIds = await getAccessibleClassIds(request);
  if (classIds === null) return null;
  if (classIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id")
    .in("class_id", classIds);
  if (error) throw new AppError(500, "FETCH_FAILED", "Unable to resolve accessible lessons");
  return (data ?? []).map((l) => l.id);
}

// Returns null for admin/teacher (no filter), or the set of class IDs the user can see
// for student (their own class) and parent (all linked students' classes).
export async function getAccessibleClassIds(request: FastifyRequest): Promise<string[] | null> {
  const role = request.profile?.role;
  const userId = request.user?.id;

  if (!role || !userId) {
    throw new AppError(401, "UNAUTHORIZED", "Authenticated user context is required");
  }

  if (role === "admin" || role === "teacher") return null;

  if (role === "student") {
    const { data, error } = await supabaseAdmin
      .from("students")
      .select("class_id")
      .eq("profile_id", userId)
      .maybeSingle();
    if (error) throw new AppError(500, "STUDENT_QUERY_FAILED", "Unable to resolve student class");
    return data?.class_id ? [data.class_id] : [];
  }

  // parent
  const { data: parent, error: parentError } = await supabaseAdmin
    .from("parents")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (parentError) throw new AppError(500, "PARENT_QUERY_FAILED", "Unable to resolve parent");
  if (!parent) return [];

  const { data: links, error: linksError } = await supabaseAdmin
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", parent.id);
  if (linksError) throw new AppError(500, "PARENT_STUDENTS_QUERY_FAILED", "Unable to resolve linked students");

  const studentIds = (links ?? []).map((l) => l.student_id);
  if (studentIds.length === 0) return [];

  const { data: students, error: studentsError } = await supabaseAdmin
    .from("students")
    .select("class_id")
    .in("id", studentIds);
  if (studentsError) throw new AppError(500, "STUDENT_QUERY_FAILED", "Unable to resolve class IDs");
  return [...new Set((students ?? []).map((s) => s.class_id).filter((v): v is string => Boolean(v)))];
}