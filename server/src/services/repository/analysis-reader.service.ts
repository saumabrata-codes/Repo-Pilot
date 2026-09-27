import fs from "node:fs/promises";
import path from "node:path";

import {
  RepositorySnapshot,
} from "../../models/repository-snapshot.model.js";

export async function getRepositorySnapshot(
  repositoryId: string
): Promise<RepositorySnapshot | null> {
  const analysisRoot = path.resolve(
    process.env.ANALYSIS_OUTPUT_DIR ||
      "./analysis"
  );

  const snapshotPath = path.join(
    analysisRoot,
    repositoryId,
    "snapshot.json"
  );

  try {
    const content =
      await fs.readFile(
        snapshotPath,
        "utf-8"
      );

    return JSON.parse(
      content
    ) as RepositorySnapshot;
  } catch {
    return null;
  }
}