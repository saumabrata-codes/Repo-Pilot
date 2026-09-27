import {
  startRepositoryAnalysis,
} from "../services/repository/repository.service.js";

export interface AnalyzeRepositoryRequest {
  githubUrl: string;
}

export function analyzeRepository(
  request: AnalyzeRepositoryRequest
) {
  const repositoryId = startRepositoryAnalysis(
    request.githubUrl
  );

  return {
    repositoryId,
    status: "queued",
    message: "Repository analysis started",
  };
}