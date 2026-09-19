import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";

if (!process.env.NODE_ENV) {
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
}
process.env.PORT ??= "4000";
process.env.RATE_LIMIT_MAX = "100";
process.env.RATE_LIMIT_WINDOW = "1 minute";
process.env.FRONTEND_URL ??= "http://localhost:3000";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";

const { buildApp } = await import("./app.js");

test("health endpoint reports liveness and security headers", async () => {
  const app = buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/health" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: "ok",
      service: "qksec-backend",
    });
    assert.equal(response.headers["x-content-type-options"], "nosniff");
  } finally {
    await app.close();
  }
});

test("protected routes reject requests without a bearer token", async () => {
  const app = buildApp();

  try {
    const response = await app.inject({ method: "GET", url: "/api/v1/auth/me" });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "UNAUTHORIZED");
  } finally {
    await app.close();
  }
});

test("rate limiting returns the configured response shape", async () => {
  const app = Fastify();
  await app.register(rateLimit, { max: 1, timeWindow: "1 minute" });
  app.get("/rate-limit-test", async () => ({ status: "ok" }));

  try {
    const firstResponse = await app.inject({ method: "GET", url: "/rate-limit-test" });
    const secondResponse = await app.inject({ method: "GET", url: "/rate-limit-test" });

    assert.equal(firstResponse.statusCode, 200);
    assert.equal(secondResponse.statusCode, 429);
    assert.equal(secondResponse.json().statusCode, 429);
  } finally {
    await app.close();
  }
});

test("auth endpoints validate sign-in and refresh payloads before contacting Supabase", async () => {
  const app = buildApp();

  try {
    const signInResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/sign-in",
      payload: { email: "invalid-email", password: "" },
    });
    const refreshResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {},
    });

    assert.equal(signInResponse.statusCode, 400);
    assert.equal(refreshResponse.statusCode, 400);
    assert.equal(signInResponse.json().error.code, "VALIDATION_ERROR");
    assert.equal(refreshResponse.json().error.code, "VALIDATION_ERROR");
  } finally {
    await app.close();
  }
});

test("sign-out clears both authentication cookies", async () => {
  const app = buildApp();

  try {
    const response = await app.inject({ method: "POST", url: "/api/v1/auth/sign-out" });
    const cookies = response.headers["set-cookie"];

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);
    assert.ok(Array.isArray(cookies));
    assert.equal(cookies.length, 2);
    assert.ok(cookies.some((cookie) => cookie.startsWith("qksec_access_token=;")));
    assert.ok(cookies.some((cookie) => cookie.startsWith("qksec_refresh_token=;")));
  } finally {
    await app.close();
  }
});