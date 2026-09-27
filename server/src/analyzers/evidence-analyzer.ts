import {
  EvidenceInfo,
} from "../models/evidence.model.js";

export function buildEvidence(
  files: { path: string }[],
  dependencies: { name: string }[],
  projectType: {
    evidence: string[];
  }
): EvidenceInfo[] {
  const evidence: EvidenceInfo[] = [];

  for (const item of projectType.evidence) {
    evidence.push({
      type: "file",
      source: item,
      description:
        `Project type detected from ${item}`,
    });
  }

  for (const dependency of dependencies) {
    evidence.push({
      type: "dependency",
      source: dependency.name,
      description:
        `Dependency detected in package metadata`,
    });
  }

  for (const file of files) {
    if (
      file.path === "README.md" ||
      file.path.endsWith("/README.md")
    ) {
      evidence.push({
        type: "file",
        source: file.path,
        description:
          "Repository documentation detected",
      });
    }
  }

  return evidence;
}