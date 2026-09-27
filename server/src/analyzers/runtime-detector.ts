export interface RuntimeInfo {
  name: string;
  version?: string;
  evidence: string[];
}

export function detectRuntime(
  packageData: {
    engines?: Record<string, string>;
  } | null,
  files: {
    path: string;
  }[]
): RuntimeInfo | undefined {
  const runtimes: RuntimeInfo[] = [];

  const paths = files.map(
    (file) => file.path
  );

  /*
   * ----------------------------------------
   * NODE.JS
   * ----------------------------------------
   */

  if (packageData?.engines?.node) {
    runtimes.push({
      name: "Node.js",
      version:
        packageData.engines.node,
      evidence: [
        "package.json > engines.node",
      ],
    });
  } else if (
    paths.some(
      (filePath) =>
        filePath
          .split("/")
          .pop()
          ?.toLowerCase() ===
        "package.json"
    )
  ) {
    runtimes.push({
      name: "Node.js",
      evidence: [
        "package.json",
      ],
    });
  }

  /*
   * ----------------------------------------
   * PYTHON
   * ----------------------------------------
   */

  const pythonVersionFile =
    paths.find(
      (filePath) =>
        filePath
          .split("/")
          .pop()
          ?.toLowerCase() ===
        ".python-version"
    );

  const hasPythonProject =
    paths.some(
      (filePath) => {
        const name =
          filePath
            .split("/")
            .pop()
            ?.toLowerCase();

        return (
          name === "requirements.txt" ||
          name === "pyproject.toml" ||
          name === "setup.py"
        );
      }
    );

  if (hasPythonProject) {
    let version: string | undefined;

    if (pythonVersionFile) {
      /*
       * The actual version content is not available
       * to this detector yet, so only record the
       * existence of the file as evidence.
       */
      version = undefined;
    }

    runtimes.push({
      name: "Python",
      version,
      evidence: [
        pythonVersionFile
          ? ".python-version"
          : "Python project metadata",
      ],
    });
  }

  /*
   * ----------------------------------------
   * MULTIPLE RUNTIMES
   * ----------------------------------------
   */

  if (runtimes.length === 0) {
    return undefined;
  }

  if (runtimes.length === 1) {
    return runtimes[0];
  }

  return {
    name: runtimes
      .map((runtime) => runtime.name)
      .join(" + "),

    evidence: runtimes.flatMap(
      (runtime) => runtime.evidence
    ),
  };
}