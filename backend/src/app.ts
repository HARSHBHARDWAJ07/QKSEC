import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { errorHandler } from "./common/errors/errorHandler.js";
import { authRoutes } from "./features/auth/auth.routes.js";
import { announcementsRoutes } from "./features/announcements/announcements.routes.js";
import { assignmentsRoutes } from "./features/assignments/assignments.routes.js";
import { classesRoutes } from "./features/classes/classes.routes.js";
import { dashboardRoutes } from "./features/dashboard/dashboard.routes.js";
import { eventsRoutes } from "./features/events/events.routes.js";
import { examsRoutes } from "./features/exams/exams.routes.js";
import { lessonsRoutes } from "./features/lessons/lessons.routes.js";
import { attendanceRoutes } from "./features/attendance/attendance.routes.js";
import { resultsRoutes } from "./features/results/results.routes.js";
import { studentsRoutes } from "./features/students/students.routes.js";
import { subjectsRoutes } from "./features/subjects/subjects.routes.js";
import { teachersRoutes } from "./features/teachers/teachers.routes.js";
import { supabaseAdmin } from "./config/supabase.js";
import { managementRoutes } from "./features/management/management.routes.js";
import { academicYearsRoutes } from "./features/academic-years/academic-years.routes.js";
import { gradesRoutes } from "./features/grades/grades.routes.js";
import { parentsRoutes } from "./features/parents/parents.routes.js";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
    // Render (and most PaaS hosts) sit behind a reverse proxy, so trust its
    // X-Forwarded-* headers for accurate request.ip (used by the rate limiter).
    trustProxy: true,
  });

  app.setErrorHandler(errorHandler);

  app.register(helmet);
  app.register(cookie);
  app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  // Probe endpoints are outside the API rate-limiter scope, so cap them independently.
  app.register(async (probes) => {
    probes.register(rateLimit, { max: 30, timeWindow: "1 minute" });

    probes.get("/health", async () => ({
      status: "ok",
      service: "qksec-backend",
    }));

    probes.get("/ready", async (_request, reply) => {
      const { error } = await supabaseAdmin.from("academic_years").select("id").limit(1);

      if (error) {
        return reply.code(503).send({
          status: "not_ready",
          service: "qksec-backend",
          dependency: "supabase",
        });
      }

      return {
        status: "ready",
        service: "qksec-backend",
        dependency: "supabase",
      };
    });
  });

  app.register(async (api) => {
    api.register(rateLimit, {
      global: true,
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
    });

    api.get("/health", async () => ({
      status: "ok",
      service: "qksec-backend",
      version: "v1",
    }));

    api.register(authRoutes, { prefix: "/auth" });
    api.register(dashboardRoutes, { prefix: "/dashboard" });
    api.register(assignmentsRoutes, { prefix: "/assignments" });
    api.register(examsRoutes, { prefix: "/exams" });
    api.register(resultsRoutes, { prefix: "/results" });
    api.register(attendanceRoutes, { prefix: "/attendance" });
    api.register(studentsRoutes, { prefix: "/students" });
    api.register(teachersRoutes, { prefix: "/teachers" });
    api.register(classesRoutes, { prefix: "/classes" });
    api.register(subjectsRoutes, { prefix: "/subjects" });
    api.register(announcementsRoutes, { prefix: "/announcements" });
    api.register(eventsRoutes, { prefix: "/events" });
    api.register(lessonsRoutes, { prefix: "/lessons" });
    api.register(academicYearsRoutes, { prefix: "/academic-years" });
    api.register(gradesRoutes, { prefix: "/grades" });
    api.register(parentsRoutes, { prefix: "/parents" });
    api.register(managementRoutes, { prefix: "/manage" });
  }, { prefix: "/api/v1" });

  return app;
}
