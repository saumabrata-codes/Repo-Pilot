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
    const content = await fs.readFile(
      packagePath,
      "utf-8"
    );

    const data: unknown = JSON.parse(content);

    if (
      typeof data !== "object" ||
      data === null
    ) {
      return null;
    }

    const packageData =
      data as Record<string, unknown>;

    return {
      name:
        typeof packageData.name === "string"
          ? packageData.name
          : undefined,

      version:
        typeof packageData.version === "string"
          ? packageData.version
          : undefined,

      description:
        typeof packageData.description === "string"
          ? packageData.description
          : undefined,

      dependencies:
        toStringRecord(
          packageData.dependencies
        ),

      devDependencies:
        toStringRecord(
          packageData.devDependencies
        ),

      scripts:
        toStringRecord(
          packageData.scripts
        ),

      engines:
        packageData.engines &&
        typeof packageData.engines === "object"
          ? toStringRecord(
              packageData.engines
            )
          : undefined,

      packageManager:
        typeof packageData.packageManager === "string"
          ? packageData.packageManager
          : undefined,
    };
  } catch {
    return null;
  }
}

function toStringRecord(
  value: unknown
): Record<string, string> {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, valueItem] of Object.entries(
    value
  )) {
    if (typeof valueItem === "string") {
      result[key] = valueItem;
    }
  }

  return result;
}