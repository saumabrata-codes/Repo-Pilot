import { RepositorySnapshot } from "../../models/repository-snapshot.model.js";

export interface SourceFile {
  path: string;
  content: string;
}

export async function getSourceFile(
  repository: RepositorySnapshot,
  filePath: string
): Promise<SourceFile | null> {
  const baseUrl = repository.source.url.replace(
    /\/+$/,
    ""
  );

  const branch =
    repository.source.branch || "main";

  const encodedPath = filePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const rawUrl =
    `${baseUrl}/raw/${encodeURIComponent(branch)}/${encodedPath}`;

  try {
    const response = await fetch(rawUrl);

    if (!response.ok) {
      return null;
    }

    const content = await response.text();

    return {
      path: filePath,
      content,
    };
  } catch {
    return null;
  }
}

export async function getRepositorySourceFiles(
  repository: RepositorySnapshot
): Promise<SourceFile[]> {
  if (!Array.isArray(repository.structure.files)) {
    return [];
  }

  const files = repository.structure.files.filter(
    (file): file is { path: string } =>
      typeof file === "object" &&
      file !== null &&
      typeof (file as { path?: unknown }).path === "string"
  );

  const results: SourceFile[] = [];

  for (const file of files) {
    const source = await getSourceFile(
      repository,
      file.path
    );

    if (source) {
      results.push(source);
    }
  }

  return results;
}