export interface ProjectTypeInfo {
  type: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

export function detectProjectType(
  files: { path: string }[]
): ProjectTypeInfo {
  const paths = files.map(
    (file) => file.path
  );

  const rootFiles = new Set(
    paths.map((filePath) => {
      return filePath
        .split("/")
        .filter(Boolean)
        .at(-1)
        ?.toLowerCase();
    })
  );

  const hasPackageJson =
    paths.some(
      (filePath) =>
        filePath
          .split("/")
          .pop()
          ?.toLowerCase() === "package.json"
    );

  const hasRequirements =
    rootFiles.has("requirements.txt");

  const hasPyproject =
    rootFiles.has("pyproject.toml");

  const hasSetupPy =
    rootFiles.has("setup.py");

  const hasGoMod =
    rootFiles.has("go.mod");

  const hasCargoToml =
    rootFiles.has("cargo.toml");

  const hasPomXml =
    rootFiles.has("pom.xml");

  const hasBuildGradle =
    rootFiles.has("build.gradle") ||
    rootFiles.has("build.gradle.kts");

  const detectedTypes: string[] = [];
  const evidence: string[] = [];

  if (
    hasRequirements ||
    hasPyproject ||
    hasSetupPy
  ) {
    detectedTypes.push("Python");

    if (hasRequirements) {
      evidence.push("requirements.txt");
    }

    if (hasPyproject) {
      evidence.push("pyproject.toml");
    }

    if (hasSetupPy) {
      evidence.push("setup.py");
    }
  }

  if (hasPackageJson) {
    detectedTypes.push("Node.js / JavaScript");

    evidence.push("package.json");
  }

  if (hasGoMod) {
    detectedTypes.push("Go");
    evidence.push("go.mod");
  }

  if (hasCargoToml) {
    detectedTypes.push("Rust");
    evidence.push("Cargo.toml");
  }

  if (hasPomXml) {
    detectedTypes.push("Java / Maven");
    evidence.push("pom.xml");
  }

  if (hasBuildGradle) {
    detectedTypes.push("Java / Gradle");
    evidence.push(
      hasBuildGradle
        ? rootFiles.has("build.gradle.kts")
          ? "build.gradle.kts"
          : "build.gradle"
        : "build.gradle"
    );
  }

  /*
   * ----------------------------------------
   * POLYGLOT PROJECT
   * ----------------------------------------
   */

  if (detectedTypes.length > 1) {
    return {
      type: `Polyglot project (${detectedTypes.join(
        " + "
      )})`,
      confidence: "high",
      evidence,
    };
  }

  /*
   * ----------------------------------------
   * SINGLE PROJECT
   * ----------------------------------------
   */

  if (detectedTypes.length === 1) {
    return {
      type: `${detectedTypes[0]} project`,
      confidence: "high",
      evidence,
    };
  }

  return {
    type: "Unknown project type",
    confidence: "low",
    evidence: [],
  };
}