export type AppRole = "admin" | "teacher" | "student" | "parent";

export type AuthUser = {
  id: string;
  email?: string;
  role?: AppRole;
};

export type ProfileRecord = {
  id: string;
  role: AppRole;
  first_name: string;
  last_name: string;
  phone?: string | null;
  address?: string | null;
  avatar_path?: string | null;
  date_of_birth?: string | null;
  sex?: "male" | "female" | null;
  blood_type?: string | null;
  created_at?: string;
  updated_at?: string;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
    profile?: ProfileRecord;
  }
}
