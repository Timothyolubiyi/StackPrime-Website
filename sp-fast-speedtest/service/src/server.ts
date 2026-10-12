import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import healthRoute from "./routes/health.js";
import speedtestRoute from "./routes/speedtest.js";

const PORT = Number(process.env.PORT ?? 4002);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const app = Fastify({
  logger: true,
  // Raised from Fastify's 1MB default — the upload-measurement endpoint
  // needs to accept multi-megabyte bodies. Still well below the per-call
  // cap enforced in the route handler itself (defense in depth).
  bodyLimit: 15 * 1024 * 1024,
});

await app.register(cors, {
  origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
});

// Global rate limit, independent of the business-logic 3-use limit — stops
// the droplet itself from being flooded with requests regardless of what
// the usage counters say.
await app.register(rateLimit, {
  max: 60,
  timeWindow: "1 minute",
});

await app.register(healthRoute);
await app.register(speedtestRoute, { prefix: "/api/speedtest" });

app.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
