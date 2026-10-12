import type { FastifyInstance } from "fastify";

export default async function healthRoute(app: FastifyInstance) {
  app.get("/api/health", async () => ({ status: "ok" }));
}
