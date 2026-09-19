import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { AppError } from "../../common/errors/AppError.js";
import { parseBody } from "../../common/http/validation.js";
import { defined } from "../../common/utils/objects.js";
import { authenticateRequest, requireRoles } from "../../common/middleware/auth.js";
import { createSupabaseUserClient, supabaseAdmin } from "../../config/supabase.js";
import { env } from "../../config/env.js";

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  dateOfBirth: z.string().date().nullable().optional(),
  sex: z.enum(["male", "female"]).nullable().optional(),
  bloodType: z.string().trim().nullable().optional(),
  avatarPath: z.string().trim().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

function setSessionCookies(reply: FastifyReply, session: { access_token: string; refresh_token: string }) {
  const cookieOptions = {
    httpOnly: true,
    // secure must be true whenever sameSite=none (browsers reject it otherwise),
    // and should be true in any non-development environment.
    secure: env.NODE_ENV !== "development" || env.AUTH_COOKIE_SAME_SITE === "none",
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
    path: "/",
  };
  reply.setCookie("qksec_access_token", session.access_token, { ...cookieOptions, maxAge: 60 * 60 });
  reply.setCookie("qksec_refresh_token", session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
}


export async function authRoutes(app: FastifyInstance) {
  app.post("/sign-in", async (request, reply) => {
    const parsed = signInSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Email and password are required", parsed.error.flatten());
    }

    const { data, error } = await createSupabaseUserClient().auth.signInWithPassword(parsed.data);
    if (error || !data.session) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    setSessionCookies(reply, data.session);
    return { user: { id: data.user.id, email: data.user.email } };
  });

  app.post("/refresh", async (request, reply) => {
    const refreshToken = request.cookies.qksec_refresh_token;
    const parsed = refreshSchema.safeParse({ refreshToken });
    if (!parsed.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Refresh token is required", parsed.error.flatten());
    }

    const { data, error } = await createSupabaseUserClient().auth.refreshSession({
      refresh_token: parsed.data.refreshToken,
    });
    if (error || !data.session) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Session could not be refreshed");
    }

    setSessionCookies(reply, data.session);
    return { user: { id: data.user?.id, email: data.user?.email } };
  });

  app.post("/sign-out", {
    preHandler: [authenticateRequest],
  }, async (request, reply) => {
    const userId = request.user?.id;
    if (userId) {
      // Invalidate the session server-side so the access token can't be reused
      await supabaseAdmin.auth.admin.signOut(userId, "local");
    }
    reply.clearCookie("qksec_access_token", { path: "/" });
    reply.clearCookie("qksec_refresh_token", { path: "/" });
    return { success: true };
  });

  // Returns the authenticated user + profile + role-specific enrichment
  app.get("/me", {
    preHandler: [authenticateRequest],
  }, async (request) => {
    const role = request.profile?.role;
    const userId = request.user?.id;

    let roleData: unknown = null;

    if (role === "teacher" && userId) {
      const { data, error } = await supabaseAdmin
        .from("teachers")
        .select(`
          id, employee_number, active,
          teacher_subjects (subjects!subject_id (id, name)),
          teacher_classes (classes!class_id (id, name, grades!grade_id (id, level), academic_years!academic_year_id (id, name, is_current)))
        `)
        .eq("profile_id", userId)
        .maybeSingle();
      if (error) throw new AppError(500, "FETCH_FAILED", error.message);
      roleData = data;
    }

    if (role === "student" && userId) {
      const { data, error } = await supabaseAdmin
        .from("students")
        .select(`
          id, student_number, enrollment_date, active, class_id,
          classes!class_id (
            id, name, capacity,
            grades!grade_id (id, level),
            academic_years!academic_year_id (id, name, is_current)
          )
        `)
        .eq("profile_id", userId)
        .maybeSingle();
      if (error) throw new AppError(500, "FETCH_FAILED", error.message);
      roleData = data;
    }

    if (role === "parent" && userId) {
      const { data, error } = await supabaseAdmin
        .from("parents")
        .select(`
          id, active,
          parent_students (
            relationship, is_primary,
            students!student_id (
              id, student_number, enrollment_date,
              profiles!profile_id (id, first_name, last_name, avatar_path),
              classes!class_id (id, name)
            )
          )
        `)
        .eq("profile_id", userId)
        .maybeSingle();
      if (error) throw new AppError(500, "FETCH_FAILED", error.message);
      roleData = data;
    }

    return {
      user: request.user,
      profile: request.profile,
      ...(roleData !== null ? { roleData } : {}),
    };
  });

  // Self-service profile update — any authenticated user can update their own profile fields
  app.patch("/profile", {
    preHandler: [authenticateRequest],
  }, async (request, reply) => {
    const body = parseBody(updateProfileSchema, request.body);
    const userId = request.user?.id;
    if (!userId) throw new AppError(401, "UNAUTHORIZED", "Authenticated user context is required");

    const updates = defined({
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone,
      address: body.address,
      date_of_birth: body.dateOfBirth,
      sex: body.sex,
      blood_type: body.bloodType,
      avatar_path: body.avatarPath,
    });

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, "NOTHING_TO_UPDATE", "No valid fields provided for update");
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("id, role, first_name, last_name, phone, address, avatar_path, blood_type, sex, date_of_birth, updated_at")
      .single();
    if (error) throw new AppError(400, "PROFILE_UPDATE_FAILED", error.message);
    return reply.send({ data });
  });

  // Self-service password change — verifies current password before updating
  app.post("/change-password", {
    preHandler: [authenticateRequest],
  }, async (request, reply) => {
    const body = parseBody(changePasswordSchema, request.body);
    const email = request.user?.email;
    const userId = request.user?.id;

    if (!email || !userId) {
      throw new AppError(401, "UNAUTHORIZED", "Authenticated user context is required");
    }

    // Verify current password by attempting a sign-in
    const { error: signInError } = await createSupabaseUserClient().auth.signInWithPassword({
      email,
      password: body.currentPassword,
    });
    if (signInError) {
      throw new AppError(400, "INVALID_PASSWORD", "Current password is incorrect");
    }

    // Update to new password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: body.newPassword,
    });
    if (updateError) {
      throw new AppError(400, "PASSWORD_CHANGE_FAILED", updateError.message);
    }

    return reply.send({ success: true });
  });

  app.get("/dashboard", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    return {
      role: request.profile?.role,
      message: "Authenticated dashboard access granted",
      userId: request.user?.id,
    };
  });
}
