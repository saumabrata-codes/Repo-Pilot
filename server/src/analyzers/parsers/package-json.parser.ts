import fs from "node:fs/promises";
import path from "node:path";

export interface PackageJsonData {
  name?: string;
  version?: string;
  description?: string;

  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;

  scripts: Record<string, string>;

  engines?: Record<string, string>;

  packageManager?: string;
}

export async function parsePackageJson(
  repositoryRoot: string
): Promise<PackageJsonData | null> {
  const packagePath = path.join(
    repositoryRoot,
    "package.json"
  );

  try {
    const content =
      await fs.readFile(packagePath, "utf-8");

    const data = JSON.parse(content) as Record<
      string,
      unknown
    >;

    return {
      name:
        typeof data.name === "string"
          ? data.name
          : undefined,

      version:
        typeof data.version === "string"
          ? data.version
          : undefined,

      description:
        typeof data.description === "string"
          ? data.description
          : undefined,

      dependencies:
        typeof data.dependencies === "object" &&
        data.dependencies !== null
          ? (data.dependencies as Record<
              string,
              string
            >)
          : {},

      devDependencies:
        typeof data.devDependencies === "object" &&
        data.devDependencies !== null
          ? (data.devDependencies as Record<
              string,
              string
            >)
          : {},

      scripts:
        typeof data.scripts === "object" &&
        data.scripts !== null
          ? (data.scripts as Record<
              string,
              string
            >)
          : {},

      engines:
        typeof data.engines === "object" &&
        data.engines !== null
          ? (data.engines as Record<
              string,
              string
            >)
          : undefined,

      packageManager:
        typeof data.packageManager === "string"
          ? data.packageManager
          : undefined,
    };
  } catch {
    return null;
  }
}