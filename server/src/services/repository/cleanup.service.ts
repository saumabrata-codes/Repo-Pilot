import fs from "node:fs/promises";

export async function cleanupRepository(
  repositoryDirectory: string
): Promise<void> {
  try {
    await fs.rm(
      repositoryDirectory,
      {
        recursive: true,
        force: true,
      }
    );

    console.log(
      `Temporary repository cleaned up: ${repositoryDirectory}`
    );
  } catch (error) {
    console.error(
      "Repository cleanup failed:",
      error
    );
  }
}