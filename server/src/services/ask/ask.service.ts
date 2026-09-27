import { analyzeQuestion } from "./question-analyzer.js";
import {
  synthesizeWithBob,
} from "./bob.service.js";
import {
  searchRepository,
  SearchResult,
} from "./repository-search.service.js";
import {
  RepositorySnapshot,
} from "../../models/repository-snapshot.model.js";

export interface AskResponse {
  summary: string;
  relevantFiles: string[];
  evidence: string[];
  flow: string[];
  confidence: number;
  bobUsed: boolean;
}

const MINIMUM_CONFIDENCE = 0.25;

export async function askRepository(
  repository: RepositorySnapshot,
  question: string
): Promise<AskResponse> {
  const analyzedQuestion =
    analyzeQuestion(question);

  const searchResults =
    await searchRepository(
      repository,
      analyzedQuestion
    );

  if (searchResults.length === 0) {
    return {
      summary:
        "I couldn't find enough repository evidence to answer this confidently.",
      relevantFiles: [],
      evidence: [],
      flow: [],
      confidence: 0,
      bobUsed: false,
    };
  }

  const confidence =
    calculateConfidence(searchResults);

  const relevantResults =
    searchResults.slice(0, 5);

  const relevantFiles =
    relevantResults.map(
      (result) => result.path
    );

  const evidence =
    relevantResults.flatMap(
      (result) => result.evidence
    );

  if (
    confidence < MINIMUM_CONFIDENCE
  ) {
    return {
      summary:
        "I couldn't find enough repository evidence to answer this confidently.",
      relevantFiles,
      evidence,
      flow: [],
      confidence,
      bobUsed: false,
    };
  }

  const flow =
    buildFlow(relevantResults);

  const summary =
    buildSummary(
      analyzedQuestion.normalizedQuestion,
      relevantResults
    );

  /*
   * Bob is disabled unless BOB_ENABLED
   * is explicitly set to "true".
   */
  const bobEnabled =
    process.env.BOB_ENABLED === "true";

  if (bobEnabled) {
    const bobResult =
      await synthesizeWithBob({
        question,
        summary,
        relevantFiles,
        evidence,
        flow,
      });

    return {
      summary: bobResult.answer,
      relevantFiles,
      evidence,
      flow,
      confidence,
      bobUsed: bobResult.usedBob,
    };
  }

  return {
    summary,
    relevantFiles,
    evidence,
    flow,
    confidence,
    bobUsed: false,
  };
}

function calculateConfidence(
  results: SearchResult[]
): number {
  if (results.length === 0) {
    return 0;
  }

  const strongestScore =
    results[0].score;

  const confidence =
    Math.min(
      strongestScore / 20,
      1
    );

  return Number(
    confidence.toFixed(2)
  );
}

function buildSummary(
  question: string,
  results: SearchResult[]
): string {
  const primaryFile =
    results[0]?.path;

  if (!primaryFile) {
    return "No repository evidence was found.";
  }

  if (
    question.includes("authentication") ||
    question.includes("auth") ||
    question.includes("login") ||
    question.includes("jwt")
  ) {
    return `Authentication-related functionality appears to be handled primarily in ${primaryFile}.`;
  }

  if (
    question.includes("authorization") ||
    question.includes("permission") ||
    question.includes("role")
  ) {
    return `Authorization-related functionality appears to be handled primarily in ${primaryFile}.`;
  }

  if (
    question.includes("database") ||
    question.includes("db") ||
    question.includes("mongodb") ||
    question.includes("mysql") ||
    question.includes("postgres") ||
    question.includes("sql")
  ) {
    return `Database-related functionality appears to be handled primarily in ${primaryFile}.`;
  }

  if (
    question.includes("api") ||
    question.includes("route") ||
    question.includes("endpoint") ||
    question.includes("controller")
  ) {
    return `API-related functionality appears to be handled primarily in ${primaryFile}.`;
  }

  if (
    question.includes("frontend") ||
    question.includes("react") ||
    question.includes("vue") ||
    question.includes("angular")
  ) {
    return `Frontend-related functionality appears to be handled primarily in ${primaryFile}.`;
  }

  if (
    question.includes("backend") ||
    question.includes("server")
  ) {
    return `Backend-related functionality appears to be handled primarily in ${primaryFile}.`;
  }

  if (
    question.includes("test") ||
    question.includes("testing") ||
    question.includes("jest") ||
    question.includes("vitest") ||
    question.includes("pytest")
  ) {
    return `Testing-related functionality appears to be handled primarily in ${primaryFile}.`;
  }

  if (
    question.includes("camera") ||
    question.includes("webcam")
  ) {
    return `Camera-related functionality appears to be handled primarily in ${primaryFile}.`;
  }

  if (
    question.includes("mediapipe") ||
    question.includes("hand") ||
    question.includes("gesture")
  ) {
    return `Gesture and hand-processing functionality appears to be handled primarily in ${primaryFile}.`;
  }

  return `The repository contains relevant evidence in ${primaryFile}.`;
}

function buildFlow(
  results: SearchResult[]
): string[] {
  const flow: string[] = [];

  for (const result of results) {
    const path =
      result.path.toLowerCase();

    if (
      path.includes("login") ||
      path.includes("auth")
    ) {
      flow.push(
        `Authentication entry point: ${result.path}`
      );
      continue;
    }

    if (
      path.includes("middleware")
    ) {
      flow.push(
        `Middleware processing: ${result.path}`
      );
      continue;
    }

    if (
      path.includes("route") ||
      path.includes("controller")
    ) {
      flow.push(
        `Request handling: ${result.path}`
      );
      continue;
    }

    if (
      path.includes("database") ||
      path.includes("db") ||
      path.includes("model") ||
      path.includes("schema")
    ) {
      flow.push(
        `Data layer: ${result.path}`
      );
      continue;
    }

    if (
      path.includes("camera")
    ) {
      flow.push(
        `Camera processing: ${result.path}`
      );
      continue;
    }

    if (
      path.includes("hand") ||
      path.includes("gesture") ||
      path.includes("pipeline")
    ) {
      flow.push(
        `Gesture processing: ${result.path}`
      );
      continue;
    }

    flow.push(
      `Relevant component: ${result.path}`
    );
  }

  return flow;
}