import path from "node:path";

export type FileCategory =
  | "source"
  | "config"
  | "documentation"
  | "test"
  | "asset"
  | "lockfile"
  | "other";

export interface ClassifiedFile {
  path: string;
  name: string;
  extension: string | null;
  category: FileCategory;
}

export function classifyFile(
  filePath: string
): ClassifiedFile {
  const name = path.basename(filePath);
  const lowerName = name.toLowerCase();

  const extension =
    path.extname(name).toLowerCase();

  const normalizedPath =
    filePath
      .split(path.sep)
      .join("/")
      .toLowerCase();

  let category: FileCategory = "other";

  /*
   * ----------------------------------------
   * LOCKFILES
   * ----------------------------------------
   */

  if (
    lowerName === "package-lock.json" ||
    lowerName === "yarn.lock" ||
    lowerName === "pnpm-lock.yaml" ||
    lowerName === "bun.lockb" ||
    lowerName === "poetry.lock"
  ) {
    category = "lockfile";
  }

  /*
   * ----------------------------------------
   * TEST FILES
   * ----------------------------------------
   */

  else if (
    lowerName.includes(".test.") ||
    lowerName.includes(".spec.") ||
    lowerName.startsWith("test_") ||
    lowerName.endsWith("_test.py") ||
    normalizedPath
      .split("/")
      .includes("test") ||
    normalizedPath
      .split("/")
      .includes("tests") ||
    normalizedPath
      .split("/")
      .includes("__tests__")
  ) {
    category = "test";
  }

  /*
   * ----------------------------------------
   * DOCUMENTATION
   * ----------------------------------------
   */

  else if (
    lowerName === "readme.md" ||
    lowerName === "readme.mdx" ||
    extension === ".md" ||
    extension === ".mdx"
  ) {
    category = "documentation";
  }

  /*
   * ----------------------------------------
   * ASSETS
   * ----------------------------------------
   */

  else if (
    [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".webp",
      ".ico",
      ".bmp",
      ".tiff",
      ".mp3",
      ".mp4",
      ".wav",
      ".mov",
      ".webm",
      ".woff",
      ".woff2",
      ".ttf",
    ].includes(extension)
  ) {
    category = "asset";
  }

  /*
   * ----------------------------------------
   * CONFIGURATION
   * ----------------------------------------
   */

  else if (
    [
      ".json",
      ".yaml",
      ".yml",
      ".toml",
      ".ini",
      ".xml",
    ].includes(extension) ||
    lowerName === ".env" ||
    lowerName === ".env.example" ||
    lowerName === ".env.sample" ||
    lowerName === "requirements.txt" ||
    lowerName === "pyproject.toml" ||
    lowerName === "setup.py" ||
    lowerName === "package.json" ||
    lowerName === "tsconfig.json" ||
    lowerName === "vite.config.ts" ||
    lowerName === "vite.config.js" ||
    lowerName === "webpack.config.js" ||
    lowerName === "next.config.js" ||
    lowerName === "next.config.ts"
  ) {
    category = "config";
  }

  /*
   * ----------------------------------------
   * SOURCE
   * ----------------------------------------
   */

  else if (
    [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".py",
      ".java",
      ".go",
      ".rs",
      ".cpp",
      ".c",
      ".h",
      ".hpp",
      ".cs",
      ".php",
      ".rb",
      ".swift",
      ".kt",
      ".kts",
      ".scala",
      ".dart",
      ".vue",
      ".svelte",
      ".html",
      ".css",
      ".scss",
      ".sass",
      ".less",
    ].includes(extension)
  ) {
    category = "source";
  }

  return {
    path: filePath,
    name,
    extension: extension || null,
    category,
  };
}