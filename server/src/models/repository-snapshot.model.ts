import {
  LanguageInfo,
} from "../analyzers/language-detector.js";

import {
  ProjectTypeInfo,
} from "../analyzers/project-detector.js";

import {
  EntryPointInfo,
} from "../analyzers/entry-point-detector.js";

import {
  TestInfo,
} from "../analyzers/test-detector.js";

import {
  FrameworkInfo,
} from "../analyzers/framework-detector.js";

import {
  RuntimeInfo,
} from "../analyzers/runtime-detector.js";

import {
  DocumentationInfo,
} from "../analyzers/documentation-analyzer.js";

import {
  ConfigurationInfo,
} from "../analyzers/configuration-analyzer.js";

import {
  RepositoryStatistics,
} from "../analyzers/statistics-analyzer.js";

import {
  EvidenceInfo,
} from "./evidence.model.js";

import {
  AnalysisLimitation,
} from "./analysis-limitation.model.js";

import {
  DependencyInfo,
} from "./dependency.model.js";

export interface RepositorySnapshot {
  id: string;

  source: {
    provider: "github";
    url: string;
    owner: string;
    name: string;
    branch: string;
  };

  repository: {
    name: string;
    description: string | null;
    visibility: "public" | "private";
    sizeKb: number;
  };

  structure: {
    fileCount: number;
    directoryCount: number;
    files: unknown[];
    directories: unknown[];
  };

  technology: {
    languages: LanguageInfo[];
    projectType: ProjectTypeInfo;
    frameworks: FrameworkInfo[];
    runtime?: RuntimeInfo;
  };

  dependencies: DependencyInfo[];

  configuration: ConfigurationInfo;

  entryPoints: EntryPointInfo[];

  tests: TestInfo;

  documentation: DocumentationInfo;

  statistics: RepositoryStatistics;

  evidence: EvidenceInfo[];

  limitations: AnalysisLimitation[];

  analysis: {
    status: "completed" | "partial" | "failed";
    analyzerVersion: string;
    startedAt: string;
    completedAt: string;
  };
}