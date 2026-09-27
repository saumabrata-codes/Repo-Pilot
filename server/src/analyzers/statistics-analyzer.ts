export interface RepositoryStatistics {
  fileCount: number;
  directoryCount: number;
  totalSizeBytes: number;
  sourceFileCount: number;
  testFileCount: number;
  documentationFileCount: number;
}

export function calculateStatistics(
  files: {
    path: string;
    sizeBytes: number;
  }[],
  classifiedFiles: {
    category: string;
  }[],
  directoryCount: number
): RepositoryStatistics {
  let totalSizeBytes = 0;

  for (const file of files) {
    totalSizeBytes += file.sizeBytes;
  }

  return {
    fileCount: files.length,
    directoryCount,
    totalSizeBytes,

    sourceFileCount:
      classifiedFiles.filter(
        (file) => file.category === "source"
      ).length,

    testFileCount:
      classifiedFiles.filter(
        (file) => file.category === "test"
      ).length,

    documentationFileCount:
      classifiedFiles.filter(
        (file) =>
          file.category === "documentation"
      ).length,
  };
}