import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = buildApp();

try {
  await app.listen({ host: "0.0.0.0", port: env.PORT });
} catch (error) {
  app.log.error(error, "Unable to start backend");
  process.exit(1);
}
