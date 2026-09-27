import { FastifyInstance } from "fastify";

import {
  askRepository,
} from "../services/ask/ask.service.js";

import {
  getRepositorySnapshot,
} from "../services/repository/analysis-reader.service.js";

export async function askRoutes(
  app: FastifyInstance
) {
  app.post(
    "/api/repository/:id/ask",
    async (request, reply) => {
      try {
        const { id } =
          request.params as {
            id: string;
          };

        const body =
          request.body as {
            question?: string;
          };

        if (
          typeof body?.question !== "string" ||
          !body.question.trim()
        ) {
          return reply.code(400).send({
            status: "error",
            message: "question is required",
          });
        }

        const snapshot =
          await getRepositorySnapshot(id);

        if (!snapshot) {
          return reply.code(404).send({
            status: "error",
            message:
              "Repository analysis not found",
          });
        }

        const answer =
          await askRepository(
            snapshot,
            body.question.trim()
          );

        return reply.code(200).send({
          status: "success",
          repositoryId: id,
          question: body.question.trim(),
          ...answer,
        });
      } catch (error) {
        app.log.error(error);

        return reply.code(500).send({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to process repository question",
        });
      }
    }
  );
}