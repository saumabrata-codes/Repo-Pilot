export interface ConfigurationInfo {
  files: string[];
  environmentExampleFiles: string[];
  configFiles: string[];
}

const CONFIG_FILE_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",

  "vite.config.js",
  "vite.config.ts",
  "vite.config.mjs",
  "vite.config.cjs",

  "webpack.config.js",
  "webpack.config.ts",

  "rollup.config.js",
  "rollup.config.ts",

  "next.config.js",
  "next.config.ts",

  "nuxt.config.js",
  "nuxt.config.ts",

  "angular.json",

  "babel.config.js",
  "babel.config.json",

  "jest.config.js",
  "jest.config.ts",

  "vitest.config.js",
  "vitest.config.ts",

  "eslint.config.js",
  "eslint.config.mjs",

  "prettier.config.js",
  "prettier.config.cjs",

  "pyproject.toml",
  "setup.py",
  "setup.cfg",

  "tox.ini",
  "pytest.ini",
  "mypy.ini",

  "requirements.txt",

  "cargo.toml",
  "go.mod",

  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
]);

const CONFIG_EXTENSIONS = new Set([
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".xml",
]);

export function analyzeConfiguration(
  repositoryFiles: { path: string }[]
): ConfigurationInfo {
  const paths = repositoryFiles.map(
    (file) => file.path
  );

  /*
   * ----------------------------------------
   * ENVIRONMENT EXAMPLE FILES
   * ----------------------------------------
   */

  const environmentExampleFiles =
    paths.filter((filePath) => {
      const name =
        filePath
          .split("/")
          .pop()
          ?.toLowerCase();

      return (
        name === ".env.example" ||
        name === ".env.sample" ||
        name === ".env.template"
      );
    });

  /*
   * ----------------------------------------
   * CONFIGURATION FILES
   * ----------------------------------------
   */

  const configFiles =
    paths.filter((filePath) => {
      const name =
        filePath
          .split("/")
          .pop()
          ?.toLowerCase();

      if (!name) {
        return false;
      }

      /*
       * Exact known configuration files
       */

      if (
        CONFIG_FILE_NAMES.has(name)
      ) {
        return true;
      }

      /*
       * Known configuration extensions
       */

      const extension =
        name.includes(".")
          ? `.${name.split(".").pop()}`
          : "";

      if (
        CONFIG_EXTENSIONS.has(extension)
      ) {
        return true;
      }

      /*
       * Environment files
       */

      if (
        name === ".env" ||
        name === ".env.example" ||
        name === ".env.sample" ||
        name === ".env.template"
      ) {
        return true;
      }

      return false;
    });

  /*
   * ----------------------------------------
   * ALL CONFIGURATION-RELATED FILES
   * ----------------------------------------
   */

  const allConfigurationFiles = [
    ...new Set([
      ...configFiles,
      ...environmentExampleFiles,
    ]),
  ];

  return {
    files: allConfigurationFiles,
    environmentExampleFiles,
    configFiles,
  };
}