import fs from "node:fs/promises";
import path from "node:path";

import {
  RepositorySnapshot,
} from "../../models/repository-snapshot.model.js";

export async function saveRepositorySnapshot(
  snapshot: RepositorySnapshot
): Promise<string> {
  const analysisRoot = path.resolve(
    process.env.ANALYSIS_OUTPUT_DIR ||
      "./analysis"
  );

  const outputDirectory = path.join(
    analysisRoot,
    snapshot.id
  );

  await fs.mkdir(
    outputDirectory,
    {
      recursive: true,
    }
  );

  await fs.writeFile(
    path.join(
      outputDirectory,
      "snapshot.json"
    ),
    JSON.stringify(
      snapshot,
      null,
      2
    ),
    "utf-8"
  );

  await fs.writeFile(
    path.join(
      outputDirectory,
      "files.json"
    ),
    JSON.stringify(
      snapshot.structure.files,
      null,
      2
    ),
    "utf-8"
  );

  await fs.writeFile(
    path.join(
      outputDirectory,
      "directories.json"
    ),
    JSON.stringify(
      snapshot.structure.directories,
      null,
      2
    ),
    "utf-8"
  );

  await fs.writeFile(
    path.join(
      outputDirectory,
      "dependencies.json"
    ),
    JSON.stringify(
      snapshot.dependencies,
      null,
      2
    ),
    "utf-8"
  );

  await fs.writeFile(
    path.join(
      outputDirectory,
      "evidence.json"
    ),
    JSON.stringify(
      snapshot.evidence,
      null,
      2
    ),
    "utf-8"
  );

  return path.join(
    outputDirectory,
    "snapshot.json"
  );
}