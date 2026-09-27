export interface DocumentationInfo {
  readmeFiles: string[];
  hasReadme: boolean;
  documentationFiles: string[];
}

export function analyzeDocumentation(
  files: { path: string }[]
): DocumentationInfo {
  const documentationFiles =
    files
      .map((file) => file.path)
      .filter((filePath) => {
        const lower =
          filePath.toLowerCase();

        return (
          lower.endsWith(".md") ||
          lower.endsWith(".mdx")
        );
      });

  const readmeFiles =
    documentationFiles.filter((filePath) =>
      filePath
        .split("/")
        .pop()
        ?.toLowerCase()
        .startsWith("readme")
    );

  return {
    readmeFiles,
    hasReadme: readmeFiles.length > 0,
    documentationFiles,
  };
}