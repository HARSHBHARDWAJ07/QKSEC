import type { FastifyInstance } from "fastify";
import { AppError } from "../../common/errors/AppError.js";
import { parsePagination, getPaginationRange, createPaginationMeta } from "../../common/utils/pagination.js";
import { assertUuid } from "../../common/http/validation.js";
import { requireRoles } from "../../common/middleware/auth.js";
import { getAccessibleClassIds } from "../../common/services/studentAccess.js";
import { supabaseAdmin } from "../../config/supabase.js";

const SELECT = `
  id, title, body, published_at, expires_at, created_at, updated_at,
  profiles!published_by (id, first_name, last_name),
  announcement_classes (class_id, classes!class_id (id, name))
`;

type AnnouncementClass = { class_id: string };

export async function announcementsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request) => {
    const { page, pageSize } = parsePagination(request.query);
    const role = request.profile?.role;

    if (role === "student" || role === "parent") {
      const now = new Date().toISOString();
      // Fetch only published, non-expired announcements for non-admin roles
      const { data, error } = await supabaseAdmin
        .from("announcements")
        .select(SELECT)
        .not("published_at", "is", null)
        .lte("published_at", now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("published_at", { ascending: false });
      if (error) throw new AppError(500, "FETCH_FAILED", error.message);

      const classIds = (await getAccessibleClassIds(request)) ?? [];
      const filtered = (data ?? []).filter((announcement) => {
        const ac: AnnouncementClass[] = (announcement as any).announcement_classes ?? [];
        return ac.length === 0 || ac.some((c) => classIds.includes(c.class_id));
      });

      const total = filtered.length;
      const from = (page - 1) * pageSize;
      const paginated = filtered.slice(from, from + pageSize);
      return { data: paginated, meta: createPaginationMeta(page, pageSize, total) };
    }

    // Admin/teacher: DB-level pagination
    const range = getPaginationRange(page, pageSize);
    const [listResult, countResult] = await Promise.all([
      supabaseAdmin.from("announcements").select(SELECT).order("published_at", { ascending: false }).range(range.from, range.to),
      supabaseAdmin.from("announcements").select("id", { count: "exact", head: true }),
    ]);
    if (listResult.error) throw new AppError(500, "FETCH_FAILED", listResult.error.message);
    if (countResult.error) throw new AppError(500, "FETCH_FAILED", countResult.error.message);
    return { data: listResult.data ?? [], meta: createPaginationMeta(page, pageSize, countResult.count ?? 0) };
  });

  app.get("/:id", {
    preHandler: [requireRoles("admin", "teacher", "student", "parent")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    assertUuid(id);

    const { data, error } = await supabaseAdmin
      .from("announcements")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new AppError(500, "FETCH_FAILED", error.message);
    if (!data) throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found");

    const role = request.profile?.role;
    if (role === "student" || role === "parent") {
      const now = new Date().toISOString();
      const d = data as any;
      if (!d.published_at || d.published_at > now) {
        throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found");
      }
      if (d.expires_at && d.expires_at <= now) {
        throw new AppError(404, "ANNOUNCEMENT_NOT_FOUND", "Announcement not found");
      }
      const classIds = (await getAccessibleClassIds(request)) ?? [];
      const ac: AnnouncementClass[] = d.announcement_classes ?? [];
      if (ac.length > 0 && !ac.some((c) => classIds.includes(c.class_id))) {
        throw new AppError(403, "FORBIDDEN", "You do not have access to this announcement");
      }
    }

    return reply.send({ data });
  });
}
