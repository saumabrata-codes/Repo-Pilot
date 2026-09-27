import Fastify from "fastify";
import dotenv from "dotenv";

import { repositoryRoutes } from "./api/repository.routes.js";
import { askRoutes } from "./api/ask.routes.js";

dotenv.config();

const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return {
    status: "ok",
    service: "RepoPilot",
  };
});

app.register(repositoryRoutes);
app.register(askRoutes);

const start = async () => {
  try {
    await app.listen({
      port: Number(process.env.PORT) || 3000,
      host: "127.0.0.1",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();