import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import unzipper from "unzipper";

export async function downloadRepositoryArchive(
  owner: string,
  repository: string,
  branch: string,
  destination: string
): Promise<string> {
  const archiveUrl =
    `https://codeload.github.com/` +
    `${encodeURIComponent(owner)}/` +
    `${encodeURIComponent(repository)}/` +
    `zip/refs/heads/${encodeURIComponent(branch)}`;

  const response = await fetch(archiveUrl, {
    headers: {
      "User-Agent": "RepoPilot",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Repository download failed with status ${response.status}`
    );
  }

  const archiveBuffer = Buffer.from(
    await response.arrayBuffer()
  );

  await fsp.mkdir(destination, {
    recursive: true,
  });

  const archivePath = path.join(
    destination,
    "repository.zip"
  );

  await fsp.writeFile(archivePath, archiveBuffer);

  return archivePath;
}

export async function extractRepositoryArchive(
  archivePath: string,
  destination: string
): Promise<string> {
  const extractionRoot = path.resolve(destination);

  await fsp.mkdir(extractionRoot, {
    recursive: true,
  });

  const directory = await unzipper.Open.file(archivePath);

  for (const entry of directory.files) {
    const entryPath = entry.path;

    if (path.isAbsolute(entryPath)) {
      throw new Error(
        `Unsafe archive entry: ${entryPath}`
      );
    }

    const targetPath = path.resolve(
      extractionRoot,
      entryPath
    );

    if (
      targetPath !== extractionRoot &&
      !targetPath.startsWith(`${extractionRoot}${path.sep}`)
    ) {
      throw new Error(
        `Unsafe archive path: ${entryPath}`
      );
    }

    if (entry.type === "Directory") {
      await fsp.mkdir(targetPath, {
        recursive: true,
      });
      continue;
    }

    await fsp.mkdir(path.dirname(targetPath), {
      recursive: true,
    });

    await new Promise<void>((resolve, reject) => {
      const readStream = entry.stream();
      const writeStream = fs.createWriteStream(targetPath);

      readStream.on("error", reject);
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);

      readStream.pipe(writeStream);
    });
  }

  return extractionRoot;
}