import { FastifyInstance } from "fastify";

import {
  analyzeRepository,
} from "../controllers/repository.controller.js";

import {
  getAnalysisProgress,
} from "../services/repository/analysis-progress.service.js";

import {
  getRepositorySnapshot,
} from "../services/repository/analysis-reader.service.js";

export async function repositoryRoutes(
  app: FastifyInstance
) {
  /*
   * ----------------------------------------
   * 1. START REPOSITORY ANALYSIS
   * ----------------------------------------
   */

  app.post(
    "/api/repository/analyze",
    async (request, reply) => {
      try {
        const body =
          request.body as {
            githubUrl?: string;
          };

        if (!body?.githubUrl) {
          return reply.code(400).send({
            status: "error",
            message: "githubUrl is required",
          });
        }

        const result = analyzeRepository({
          githubUrl: body.githubUrl,
        });

        return reply.code(202).send(result);
      } catch (error) {
        return reply.code(400).send({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Invalid GitHub repository URL",
        });
      }
    }
  );

  /*
   * ----------------------------------------
   * 2. GET ANALYSIS PROGRESS
   * ----------------------------------------
   */

  app.get(
    "/api/repository/:id/status",
    async (request, reply) => {
      const { id } =
        request.params as {
          id: string;
        };

      const progress =
        getAnalysisProgress(id);

      if (!progress) {
        return reply.code(404).send({
          status: "error",
          message: "Analysis not found",
        });
      }

      return reply.code(200).send(progress);
    }
  );

  /*
   * ----------------------------------------
   * 3. GET COMPLETED REPOSITORY SNAPSHOT
   * ----------------------------------------
   */

  app.get(
    "/api/repository/:id",
    async (request, reply) => {
      const { id } =
        request.params as {
          id: string;
        };

      const snapshot =
        await getRepositorySnapshot(id);

      if (!snapshot) {
        return reply.code(404).send({
          status: "error",
          message:
            "Repository analysis not found",
        });
      }

      return reply.code(200).send(snapshot);
    }
  );
}