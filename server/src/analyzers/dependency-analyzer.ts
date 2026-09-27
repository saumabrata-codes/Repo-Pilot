import {
  DependencyInfo,
} from "../models/dependency.model.js";

import {
  PackageJsonData,
} from "../parsers/package-json.parser.js";

export function analyzePackageDependencies(
  packageData: PackageJsonData
): DependencyInfo[] {
  const dependencies: DependencyInfo[] = [];

  for (const [name, version] of Object.entries(
    packageData.dependencies
  )) {
    dependencies.push({
      name,
      version,
      type: "runtime",
      source: "package.json",
    });
  }

  for (const [name, version] of Object.entries(
    packageData.devDependencies
  )) {
    dependencies.push({
      name,
      version,
      type: "development",
      source: "package.json",
    });
  }

  return dependencies;
}


/*
 * ----------------------------------------
 * PYTHON REQUIREMENTS
 * ----------------------------------------
 */

export function analyzePythonRequirements(
  content: string
): DependencyInfo[] {
  const dependencies: DependencyInfo[] = [];

  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    /*
     * Ignore:
     * - empty lines
     * - comments
     * - editable installs
     * - pip options
     */

    if (
      !line ||
      line.startsWith("#") ||
      line.startsWith("-")
    ) {
      continue;
    }

    /*
     * Supports:
     *
     * flask
     * flask==3.0.0
     * flask>=3.0
     * flask~=3.0
     * flask[async]==3.0
     */

    const match = line.match(
      /^([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?(?:\s*(==|>=|<=|~=|!=|>|<)\s*([^\s;]+))?/
    );

    if (!match) {
      continue;
    }

    const name = match[1];

    const operator = match[2];

    const version =
      match[3]
        ? `${operator}${match[3]}`
        : "*";

    dependencies.push({
      name,
      version,
      type: "runtime",
      source: "requirements.txt",
    });
  }

  return dependencies;
}