import { AnalyzedQuestion } from "./question-analyzer.js";
import {
  RepositorySnapshot,
} from "../../models/repository-snapshot.model.js";
import {
  getRepositorySourceFiles,
  SourceFile,
} from "./github-source.service.js";

export interface RepositoryFile {
  path: string;
  name: string;
  extension: string | null;
  sizeBytes: number;
  type: string;
  content?: string;
}

export interface SearchResult {
  path: string;
  score: number;
  matchedKeywords: string[];
  evidence: string[];
}

export async function searchRepository(
  repository: RepositorySnapshot,
  question: AnalyzedQuestion
): Promise<SearchResult[]> {
  const files = normalizeFiles(repository);

  const sourceFiles =
    await getRepositorySourceFiles(repository);

  const sourceMap = new Map<string, SourceFile>();

  for (const sourceFile of sourceFiles) {
    sourceMap.set(sourceFile.path, sourceFile);
  }

  for (const file of files) {
    const source = sourceMap.get(file.path);

    if (source) {
      file.content = source.content;
    }
  }

  const results: SearchResult[] = [];

  for (const file of files) {
    const result = scoreFile(
      file,
      question.keywords
    );

    if (result) {
      results.push(result);
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, 5);
}

function normalizeFiles(
  repository: RepositorySnapshot
): RepositoryFile[] {
  if (!Array.isArray(repository.structure.files)) {
    return [];
  }

  return repository.structure.files
    .filter(
      (file): file is Record<string, unknown> =>
        typeof file === "object" &&
        file !== null
    )
    .map((file) => ({
      path:
        typeof file.path === "string"
          ? file.path
          : "",

      name:
        typeof file.name === "string"
          ? file.name
          : "",

      extension:
        typeof file.extension === "string"
          ? file.extension
          : null,

      sizeBytes:
        typeof file.sizeBytes === "number"
          ? file.sizeBytes
          : 0,

      type:
        typeof file.type === "string"
          ? file.type
          : "file",
    }))
    .filter((file) => file.path.length > 0);
}

function scoreFile(
  file: RepositoryFile,
  keywords: string[]
): SearchResult | null {
  const pathText = file.path.toLowerCase();
  const nameText = file.name.toLowerCase();
  const contentText =
    (file.content ?? "").toLowerCase();

  const matchedKeywords = new Set<string>();

  let score = 0;

  /*
   * Ignore files that are normally not useful
   * for repository questions.
   */
  const ignoredExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".lock",
  ];

  if (
    file.extension &&
    ignoredExtensions.includes(
      file.extension.toLowerCase()
    )
  ) {
    return null;
  }

  if (
    nameText === ".gitignore" ||
    nameText === "license"
  ) {
    return null;
  }

  /*
   * Path and filename matching.
   */
  for (const keyword of keywords) {
    const k = keyword.toLowerCase();

    if (pathText.includes(k)) {
      matchedKeywords.add(keyword);
      score += 5;
    }

    if (nameText.includes(k)) {
      matchedKeywords.add(keyword);
      score += 4;
    }
  }

  /*
   * Actual source-code matching.
   * This is stronger evidence than a filename match.
   */
  if (contentText) {
    for (const keyword of keywords) {
      const k = keyword.toLowerCase();

      const occurrences =
        countOccurrences(
          contentText,
          k
        );

      if (occurrences > 0) {
        matchedKeywords.add(keyword);

        score += Math.min(
          occurrences * 3,
          12
        );
      }
    }
  }

  /*
   * Question-specific structural signals.
   */
  const hasKeyword = (
    values: string[]
  ) =>
    keywords.some((keyword) =>
      values.includes(
        keyword.toLowerCase()
      )
    );

  if (
    hasKeyword([
      "camera",
      "webcam"
    ]) &&
    contentText.includes(
      "videocapture"
    )
  ) {
    score += 15;
  }

  if (
    hasKeyword([
      "authentication",
      "auth",
      "login",
      "jwt"
    ])
  ) {
    if (
      pathText.includes("auth") ||
      pathText.includes("login") ||
      pathText.includes("middleware")
    ) {
      score += 8;
    }
  }

  if (
    hasKeyword([
      "database",
      "db",
      "mongodb",
      "mysql",
      "postgres",
      "sql"
    ])
  ) {
    if (
      pathText.includes("database") ||
      pathText.includes("db") ||
      pathText.includes("model") ||
      pathText.includes("schema")
    ) {
      score += 8;
    }
  }

  if (
    hasKeyword([
      "api",
      "route",
      "routes",
      "endpoint",
      "controller"
    ])
  ) {
    if (
      pathText.includes("route") ||
      pathText.includes("controller") ||
      pathText.includes("api")
    ) {
      score += 6;
    }
  }

  if (
    hasKeyword([
      "gesture",
      "hand",
      "mediapipe"
    ])
  ) {
    if (
      contentText.includes("mediapipe") ||
      contentText.includes("hand_landmarks") ||
      pathText.includes("hand") ||
      pathText.includes("gesture")
    ) {
      score += 10;
    }
  }

  if (score === 0) {
    return null;
  }

  return {
    path: file.path,
    score,
    matchedKeywords:
      Array.from(matchedKeywords),
    evidence: extractEvidence(
      file,
      Array.from(matchedKeywords)
    ),
  };
}

function countOccurrences(
  text: string,
  search: string
): number {
  if (!search) {
    return 0;
  }

  let count = 0;
  let position = 0;

  while (true) {
    const found =
      text.indexOf(search, position);

    if (found === -1) {
      break;
    }

    count++;
    position =
      found + search.length;
  }

  return count;
}

function extractEvidence(
  file: RepositoryFile,
  keywords: string[]
): string[] {
  if (!file.content) {
    return [
      `Repository file: ${file.path}`,
    ];
  }

  const lines =
    file.content.split(/\r?\n/);

  const evidence: string[] = [];

  for (
    let index = 0;
    index < lines.length;
    index++
  ) {
    const line = lines[index];
    const lowerLine =
      line.toLowerCase();

    const matched =
      keywords.some((keyword) =>
        lowerLine.includes(
          keyword.toLowerCase()
        )
      );

    /*
     * Special source-code patterns.
     */
    const cameraMatch =
      lowerLine.includes(
        "videocapture"
      );

    if (matched || cameraMatch) {
      const start =
        Math.max(0, index - 1);

      const end =
        Math.min(
          lines.length,
          index + 2
        );

      for (
        let i = start;
        i < end;
        i++
      ) {
        const trimmed =
          lines[i].trim();

        if (
          trimmed &&
          !evidence.includes(
            trimmed
          )
        ) {
          evidence.push(trimmed);
        }
      }
    }

    if (evidence.length >= 8) {
      break;
    }
  }

  if (evidence.length === 0) {
    evidence.push(
      `Repository file: ${file.path}`
    );
  }

  return evidence;
}