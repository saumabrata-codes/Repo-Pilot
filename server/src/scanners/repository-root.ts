import fs from "node:fs/promises";
import path from "node:path";

export async function resolveRepositoryRoot(
  extractedPath: string
): Promise<string> {
  const entries = await fs.readdir(extractedPath, {
    withFileTypes: true,
  });

  const files = entries.filter((entry) =>
    entry.isFile()
  );

  const directories = entries.filter((entry) =>
    entry.isDirectory()
  );

  if (files.length > 0 || directories.length !== 1) {
    return extractedPath;
  }

  return path.join(
    extractedPath,
    directories[0].name
  );
}