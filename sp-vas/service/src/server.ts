import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { scanRoutes } from "./routes/scan.js";
import { healthRoutes } from "./routes/health.js";

const PORT = Number(process.env.PORT ?? 4001);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "https://stackprimeconsulting.com,https://www.stackprimeconsulting.com")
  .split(",")
  .map((o) => o.trim());

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  });

  // Global rate limit — belt-and-suspenders alongside the 3-use business
  // limit, protects the droplet itself from being used to flood scan
  // requests regardless of the per-user usage counter.
  await app.register(rateLimit, {
    max: 20,
    timeWindow: "1 minute",
  });

  await app.register(healthRoutes);
  await app.register(scanRoutes);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`SP VAS service listening on :${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
