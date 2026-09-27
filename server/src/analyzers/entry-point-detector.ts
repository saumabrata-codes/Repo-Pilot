export interface EntryPointInfo {
  path: string;
  reason: string;
}

const ENTRY_NAMES = new Set([
  "main.ts",
  "main.tsx",
  "main.js",
  "main.jsx",
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "app.ts",
  "app.tsx",
  "app.js",
  "app.jsx",
  "server.ts",
  "server.js",
  "main.py",
  "app.py",
  "server.py",
  "run.py",
  "predict.py",
  "train.py",
]);

export function detectEntryPoints(
  files: { path: string }[]
): EntryPointInfo[] {
  const results: EntryPointInfo[] = [];

  for (const file of files) {
    const name = file.path
      .split("/")
      .pop()
      ?.toLowerCase();

    if (!name) {
      continue;
    }

    if (ENTRY_NAMES.has(name)) {
      results.push({
        path: file.path,
        reason:
          `Matches conventional entry-point filename: ${name}`,
      });
    }
  }

  return results;
}