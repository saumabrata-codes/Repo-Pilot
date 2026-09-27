import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { parseGitHubUrl } from "../../utils/github-url.js";

import { getRepositoryMetadata } from "./github.service.js";

import {
  downloadRepositoryArchive,
  extractRepositoryArchive,
} from "../../extractors/archive-extractor.js";

import {
  createAnalysisProgress,
  updateAnalysisProgress,
} from "./analysis-progress.service.js";

import {
  resolveRepositoryRoot,
} from "../../scanners/repository-root.js";

import {
  scanRepository,
} from "../../scanners/repository-scanner.js";

import {
  detectLanguages,
} from "../../analyzers/language-detector.js";

import {
  detectProjectType,
} from "../../analyzers/project-detector.js";

import {
  detectEntryPoints,
} from "../../analyzers/entry-point-detector.js";

import {
  detectTests,
} from "../../analyzers/test-detector.js";

import {
  parsePackageJson,
} from "../../parsers/package-json.parser.js";

import {
  analyzePackageDependencies,
  analyzePythonRequirements,
} from "../../analyzers/dependency-analyzer.js";

import {
  detectRuntime,
} from "../../analyzers/runtime-detector.js";

import {
  detectFrameworks,
} from "../../analyzers/framework-detector.js";

import {
  analyzeDocumentation,
} from "../../analyzers/documentation-analyzer.js";

import {
  analyzeConfiguration,
} from "../../analyzers/configuration-analyzer.js";

import {
  calculateStatistics,
} from "../../analyzers/statistics-analyzer.js";

import {
  buildEvidence,
} from "../../analyzers/evidence-analyzer.js";

import {
  detectLimitations,
} from "../../analyzers/limitation-analyzer.js";

import {
  RepositorySnapshot,
} from "../../models/repository-snapshot.model.js";

import {
  buildRepositorySnapshot,
} from "../../analyzers/repository-snapshot-builder.js";

import {
  saveRepositorySnapshot,
} from "./analysis-storage.service.js";

import {
  cleanupRepository,
} from "./cleanup.service.js";


export interface RepositoryAnalysisResult {
  repositoryId: string;

  source: {
    url: string;
    owner: string;
    repository: string;
    branch: string;
  };

  metadata: {
    name: string;
    description: string | null;
    visibility: "public" | "private";
    sizeKb: number;
    htmlUrl: string;
  };

  local: {
    archivePath: string;
    extractedPath: string;
    repositoryRoot: string;
  };

  analysis: {
    fileCount: number;
    directoryCount: number;

    languages: ReturnType<
      typeof detectLanguages
    >;

    projectType: ReturnType<
      typeof detectProjectType
    >;

    frameworks: ReturnType<
      typeof detectFrameworks
    >;

    runtime: ReturnType<
      typeof detectRuntime
    >;

    dependencies: ReturnType<
      typeof analyzePackageDependencies
    >;

    entryPoints: ReturnType<
      typeof detectEntryPoints
    >;

    tests: ReturnType<
      typeof detectTests
    >;

    documentation: ReturnType<
      typeof analyzeDocumentation
    >;

    configuration: ReturnType<
      typeof analyzeConfiguration
    >;

    snapshotPath: string;
  };
}


/**
 * Creates an analysis job and starts it
 * in the background.
 */
export function startRepositoryAnalysis(
  githubUrl: string
): string {
  const repositoryId =
    crypto.randomUUID();

  createAnalysisProgress(
    repositoryId
  );

  void runRepositoryAnalysis(
    repositoryId,
    githubUrl
  );

  return repositoryId;
}


/**
 * Performs the complete repository analysis.
 */
async function runRepositoryAnalysis(
  repositoryId: string,
  githubUrl: string
): Promise<void> {
  const startedAt =
    new Date().toISOString();

  try {
    /*
     * ----------------------------------------
     * 1. VALIDATE REPOSITORY URL
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        progress: 10,
        stage: "validating",
        message:
          "Validating GitHub repository",
      }
    );

    const repository =
      parseGitHubUrl(githubUrl);


    /*
     * ----------------------------------------
     * 2. FETCH GITHUB METADATA
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        progress: 20,
        stage: "metadata",
        message:
          "Fetching repository metadata",
      }
    );

    const metadata =
      await getRepositoryMetadata(
        repository.owner,
        repository.repository
      );


    /*
     * ----------------------------------------
     * 3. CHECK REPOSITORY SIZE
     * ----------------------------------------
     */

    const maxRepositorySizeMb =
      Number(
        process.env.MAX_REPOSITORY_SIZE_MB ||
          500
      );

    const maxRepositorySizeKb =
      maxRepositorySizeMb * 1024;

    if (
      metadata.sizeKb >
      maxRepositorySizeKb
    ) {
      throw new Error(
        `Repository exceeds the maximum allowed size of ${maxRepositorySizeMb} MB`
      );
    }


    /*
     * ----------------------------------------
     * 4. CREATE TEMP DIRECTORY
     * ----------------------------------------
     */

    const repositoryDirectory =
      path.resolve(
        process.env.REPOSITORY_TEMP_DIR ||
          "./temp",
        repositoryId
      );


    /*
     * ----------------------------------------
     * 5. DOWNLOAD REPOSITORY
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        status: "downloading",
        progress: 35,
        stage: "downloading",
        message:
          "Downloading repository archive",
      }
    );

    const archivePath =
      await downloadRepositoryArchive(
        repository.owner,
        repository.repository,
        metadata.defaultBranch,
        repositoryDirectory
      );


    /*
     * ----------------------------------------
     * 6. EXTRACT REPOSITORY
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        status: "extracting",
        progress: 50,
        stage: "extracting",
        message:
          "Extracting repository archive",
      }
    );

    const extractedPath =
      await extractRepositoryArchive(
        archivePath,
        path.join(
          repositoryDirectory,
          "source"
        )
      );


    /*
     * ----------------------------------------
     * 7. RESOLVE ACTUAL REPOSITORY ROOT
     * ----------------------------------------
     */

    const repositoryRoot =
      await resolveRepositoryRoot(
        extractedPath
      );


    /*
     * ----------------------------------------
     * 8. SCAN FILESYSTEM
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        status: "scanning",
        progress: 65,
        stage: "scanning",
        message:
          "Scanning repository files",
      }
    );

    const scanResult =
      await scanRepository(
        repositoryRoot
      );

    console.log(
      `Repository scan completed: ${scanResult.fileCount} files, ${scanResult.directoryCount} directories`
    );


    /*
     * ----------------------------------------
     * 9. LANGUAGE DETECTION
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        status: "analyzing",
        progress: 70,
        stage: "language_detection",
        message:
          "Detecting programming languages",
      }
    );

    const languages =
      detectLanguages(
        scanResult.files
      );


    /*
     * ----------------------------------------
     * 10. PROJECT TYPE
     * ----------------------------------------
     */

    const projectType =
      detectProjectType(
        scanResult.files
      );


    /*
     * ----------------------------------------
     * 11. ENTRY POINTS
     * ----------------------------------------
     */

    const entryPoints =
      detectEntryPoints(
        scanResult.files
      );


    /*
     * ----------------------------------------
     * 12. TEST DETECTION
     * ----------------------------------------
     */

    const tests =
      detectTests(
        scanResult.files
      );


    /*
     * ----------------------------------------
     * 13. PACKAGE.JSON
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        progress: 75,
        stage: "dependency_analysis",
        message:
          "Analyzing project dependencies",
      }
    );

    const packageData =
  await parsePackageJson(
    repositoryRoot
  );


/*
 * ----------------------------------------
 * JAVASCRIPT DEPENDENCIES
 * ----------------------------------------
 */

const javascriptDependencies =
  packageData
    ? analyzePackageDependencies(
        packageData
      )
    : [];


/*
 * ----------------------------------------
 * PYTHON DEPENDENCIES
 * ----------------------------------------
 */

let pythonDependencies: ReturnType<
  typeof analyzePythonRequirements
> = [];

const requirementsPath =
  path.join(
    repositoryRoot,
    "requirements.txt"
  );

try {
  const requirementsContent =
    await fs.readFile(
      requirementsPath,
      "utf-8"
    );

  pythonDependencies =
    analyzePythonRequirements(
      requirementsContent
    );
} catch {
  /*
   * requirements.txt does not exist.
   */
}


/*
 * ----------------------------------------
 * COMBINED DEPENDENCIES
 * ----------------------------------------
 */

const dependencies = [
  ...javascriptDependencies,
  ...pythonDependencies,
];


    /*
     * ----------------------------------------
     * 15. RUNTIME
     * ----------------------------------------
     */

    const runtime =
  detectRuntime(
    packageData,
    scanResult.files
  );


    /*
     * ----------------------------------------
     * 16. FRAMEWORKS
     * ----------------------------------------
     */

    const frameworks =
      detectFrameworks(
        dependencies
      );


    /*
     * ----------------------------------------
     * 17. DOCUMENTATION
     * ----------------------------------------
     */

    const documentation =
      analyzeDocumentation(
        scanResult.files
      );


    /*
     * ----------------------------------------
     * 18. CONFIGURATION
     * ----------------------------------------
     */

    const configuration =
      analyzeConfiguration(
        scanResult.files
      );


    /*
     * ----------------------------------------
     * 19. STATISTICS
     * ----------------------------------------
     */

    const statistics =
      calculateStatistics(
        scanResult.files,
        scanResult.classifiedFiles,
        scanResult.directoryCount
      );


    /*
     * ----------------------------------------
     * 20. EVIDENCE
     * ----------------------------------------
     */

    const evidence =
      buildEvidence(
        scanResult.files,
        dependencies,
        projectType
      );


    /*
     * ----------------------------------------
     * 21. LIMITATIONS
     * ----------------------------------------
     */

    const limitations =
      detectLimitations(
        scanResult.files
      );


    /*
     * ----------------------------------------
     * 22. BUILD SNAPSHOT
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        progress: 90,
        stage: "building_snapshot",
        message:
          "Building repository snapshot",
      }
    );

    const completedAt =
      new Date().toISOString();

    const snapshotInput:
      RepositorySnapshot = {
        id: repositoryId,

        source: {
          provider: "github",
          url: repository.url,
          owner: repository.owner,
          name: metadata.name,
          branch:
            metadata.defaultBranch,
        },

        repository: {
          name: metadata.name,
          description:
            metadata.description,
          visibility:
            metadata.visibility,
          sizeKb:
            metadata.sizeKb,
        },

        structure: {
          fileCount:
            scanResult.fileCount,

          directoryCount:
            scanResult.directoryCount,

          files:
            scanResult.files,

          directories:
            scanResult.directories,
        },

        technology: {
          languages,
          projectType,
          frameworks,
          runtime,
        },

        dependencies,

        configuration,

        entryPoints,

        tests,

        documentation,

        statistics,

        evidence,

        limitations,

        analysis: {
          status: "completed",

          analyzerVersion:
            "0.1.0",

          startedAt,

          completedAt,
        },
      };


    /*
     * ----------------------------------------
     * 23. BUILD / NORMALIZE SNAPSHOT
     * ----------------------------------------
     */

    const snapshot =
      buildRepositorySnapshot(
        snapshotInput
      );


    /*
     * ----------------------------------------
     * 24. PERSIST SNAPSHOT
     * ----------------------------------------
     */

    const snapshotPath =
      await saveRepositorySnapshot(
        snapshot
      );

    console.log(
      `RepositorySnapshot saved: ${snapshotPath}`
    );


    /*
     * ----------------------------------------
     * 25. CLEAN TEMPORARY FILES
     * ----------------------------------------
     */

    await cleanupRepository(
      repositoryDirectory
    );


    /*
     * ----------------------------------------
     * 26. COMPLETE
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        status: "completed",
        progress: 100,
        stage: "completed",
        message:
          "Repository analysis completed",
      }
    );

    console.log(
      `Repository analysis completed: ${repositoryId}`
    );

  } catch (error) {

    /*
     * ----------------------------------------
     * FAILURE
     * ----------------------------------------
     */

    updateAnalysisProgress(
      repositoryId,
      {
        status: "failed",
        progress: 0,
        stage: "failed",
        message:
          "Repository analysis failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown analysis error",
      }
    );

    console.error(
      `Repository analysis failed: ${repositoryId}`,
      error
    );
  }
}