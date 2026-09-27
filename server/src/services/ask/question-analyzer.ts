export interface AnalyzedQuestion {
  originalQuestion: string;
  normalizedQuestion: string;
  keywords: string[];
}

const STOP_WORDS = new Set([
  "where",
  "what",
  "which",
  "who",
  "when",
  "why",
  "how",
  "is",
  "are",
  "was",
  "were",
  "the",
  "a",
  "an",
  "in",
  "on",
  "of",
  "to",
  "for",
  "this",
  "that",
  "does",
  "do",
  "can",
  "i",
  "my",
  "me",
  "and",
  "or",
]);

const KEYWORD_ALIASES: Record<string, string[]> = {
  authentication: [
    "authentication",
    "auth",
    "login",
    "jwt",
    "middleware",
    "session",
  ],

  authorization: [
    "authorization",
    "authorize",
    "permission",
    "permissions",
    "role",
    "roles",
    "access",
  ],

  database: [
    "database",
    "db",
    "mongodb",
    "mongo",
    "mysql",
    "postgres",
    "postgresql",
    "sql",
    "model",
    "schema",
  ],

  api: [
    "api",
    "route",
    "routes",
    "endpoint",
    "controller",
    "request",
    "response",
  ],

  frontend: [
    "frontend",
    "client",
    "ui",
    "component",
    "page",
    "react",
    "vue",
    "angular",
  ],

  backend: [
    "backend",
    "server",
    "service",
    "controller",
    "middleware",
  ],

  configuration: [
    "configuration",
    "config",
    "environment",
    "env",
    "settings",
  ],

  testing: [
    "test",
    "tests",
    "testing",
    "spec",
    "jest",
    "vitest",
    "pytest",
  ],
};

export function normalizeQuestion(
  question: string
): string {
  return question
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractKeywords(
  normalizedQuestion: string
): string[] {
  const words = normalizedQuestion
    .split(/\s+/)
    .filter(Boolean);

  const keywords = new Set<string>();

  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      keywords.add(word);
    }
  }

  for (const [concept, aliases] of Object.entries(
    KEYWORD_ALIASES
  )) {
    if (
      words.includes(concept) ||
      aliases.some((alias) =>
        words.includes(alias)
      )
    ) {
      for (const alias of aliases) {
        keywords.add(alias);
      }
    }
  }

  return Array.from(keywords);
}

export function analyzeQuestion(
  question: string
): AnalyzedQuestion {
  const normalizedQuestion =
    normalizeQuestion(question);

  const keywords =
    extractKeywords(normalizedQuestion);

  return {
    originalQuestion: question,
    normalizedQuestion,
    keywords,
  };
}