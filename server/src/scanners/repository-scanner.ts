import fs from "node:fs/promises";
import path from "node:path";

import {
  classifyFile,
  ClassifiedFile,
} from "./file-scanner.js";

export interface ScannedFile {
  path: string;
  name: string;
  extension: string | null;
  sizeBytes: number;
  type: "file";
}

export interface ScannedDirectory {
  path: string;
  name: string;
  type: "directory";
}

export interface RepositoryScanResult {
  files: ScannedFile[];
  classifiedFiles: ClassifiedFile[];
  directories: ScannedDirectory[];
  fileCount: number;
  directoryCount: number;
}

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
]);

async function scanDirectory(
  rootPath: string,
  currentPath: string,
  files: ScannedFile[],
  directories: ScannedDirectory[]
): Promise<void> {
  const entries = await fs.readdir(currentPath, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const absolutePath = path.join(
      currentPath,
      entry.name
    );

    const relativePath = path
      .relative(rootPath, absolutePath)
      .split(path.sep)
      .join("/");

    if (
      entry.isDirectory() &&
      IGNORED_DIRECTORIES.has(entry.name)
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      directories.push({
        path: relativePath,
        name: entry.name,
        type: "directory",
      });

      await scanDirectory(
        rootPath,
        absolutePath,
        files,
        directories
      );

      continue;
    }

    if (entry.isFile()) {
      const stats = await fs.stat(absolutePath);

      const extension = path.extname(entry.name);

      files.push({
        path: relativePath,
        name: entry.name,
        extension: extension
          ? extension.toLowerCase()
          : null,
        sizeBytes: stats.size,
        type: "file",
      });
    }
  }
}

export async function scanRepository(
  repositoryPath: string
): Promise<RepositoryScanResult> {
  const files: ScannedFile[] = [];
  const classifiedFiles: ClassifiedFile[] = [];
  const directories: ScannedDirectory[] = [];

  await scanDirectory(
    repositoryPath,
    repositoryPath,
    files,
    directories
  );

  for (const file of files) {
    classifiedFiles.push(
      classifyFile(file.path)
    );
  }

  return {
    files,
    classifiedFiles,
    directories,
    fileCount: files.length,
    directoryCount: directories.length,
  };
}