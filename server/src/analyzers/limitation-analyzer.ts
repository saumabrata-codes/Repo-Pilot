import {
  AnalysisLimitation,
} from "../models/analysis-limitation.model.js";

export function detectLimitations(
  files: { path: string }[]
): AnalysisLimitation[] {
  const limitations: AnalysisLimitation[] = [];

  const hasPackageJson =
    files.some(
      (file) =>
        file.path === "package.json"
    );

  if (!hasPackageJson) {
    limitations.push({
      code: "NO_PACKAGE_JSON",
      message:
        "No package.json was found; JavaScript dependency and runtime analysis may be incomplete.",
    });
  }

  return limitations;
}