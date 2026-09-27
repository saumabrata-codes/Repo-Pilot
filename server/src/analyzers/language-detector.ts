import path from "node:path";

export interface LanguageInfo {
  language: string;
  fileCount: number;
  extensions: string[];
}

const EXTENSION_LANGUAGE: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".py": "Python",
  ".java": "Java",
  ".go": "Go",
  ".rs": "Rust",
  ".c": "C",
  ".cpp": "C++",
  ".cs": "C#",
  ".php": "PHP",
  ".rb": "Ruby",
  ".swift": "Swift",
  ".kt": "Kotlin",
};

export function detectLanguages(
  files: { path: string }[]
): LanguageInfo[] {
  const counts = new Map<
    string,
    {
      fileCount: number;
      extensions: Set<string>;
    }
  >();

  for (const file of files) {
    const extension = path.extname(file.path).toLowerCase();
    const language = EXTENSION_LANGUAGE[extension];

    if (!language) {
      continue;
    }

    const existing = counts.get(language);

    if (existing) {
      existing.fileCount++;
      existing.extensions.add(extension);
    } else {
      counts.set(language, {
        fileCount: 1,
        extensions: new Set([extension]),
      });
    }
  }

  return [...counts.entries()]
    .map(([language, data]) => ({
      language,
      fileCount: data.fileCount,
      extensions: [...data.extensions],
    }))
    .sort(
      (a, b) => b.fileCount - a.fileCount
    );
}