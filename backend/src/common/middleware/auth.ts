import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError.js";
import { createSupabaseUserClient, supabaseAdmin } from "../../config/supabase.js";
import type { AppRole, AuthUser, ProfileRecord } from "../types/auth.types.js";

export async function authenticateRequest(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const authorizationHeader = request.headers.authorization;
  const cookieToken = request.cookies.qksec_access_token;

  if ((!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) && !cookieToken) {
    throw new AppError(401, "UNAUTHORIZED", "Authorization token is required");
  }

  const token = cookieToken ?? authorizationHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Authorization token is required");
  }

  const userClient = createSupabaseUserClient(token);
  const { data: userData, error: userError } = await userClient.auth.getUser(token);

  if (userError || !userData.user) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, role, first_name, last_name, phone, address, avatar_path, date_of_birth, sex, blood_type, created_at, updated_at",
    )
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    throw new AppError(500, "PROFILE_QUERY_FAILED", "Unable to load user profile");
  }

  if (!profileData) {
    throw new AppError(403, "PROFILE_NOT_FOUND", "User profile not found");
  }

  const authUser: AuthUser = {
    id: userData.user.id,
    email: userData.user.email ?? undefined,
    role: profileData.role as AppRole,
  };

  request.user = authUser;
  request.profile = profileData as ProfileRecord;
}

export function requireRoles(...allowedRoles: AppRole[]) {
  return async function requireAllowedRole(request: FastifyRequest, _reply: FastifyReply) {
    await authenticateRequest(request, _reply);

    const currentRole = request.profile?.role;

    if (!currentRole || !allowedRoles.includes(currentRole)) {
      throw new AppError(
        403,
        "FORBIDDEN",
        `This action requires one of the following roles: ${allowedRoles.join(", ")}`,
      );
    }
  };
}

export const requireAuth = authenticateRequest;
