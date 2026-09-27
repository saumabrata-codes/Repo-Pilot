export interface TestInfo {
  testFiles: string[];
  testFileCount: number;
  detected: boolean;
}

export function detectTests(
  files: { path: string }[]
): TestInfo {
  const testFiles = files
    .map((file) => file.path)
    .filter((filePath) => {
      const lower =
        filePath.toLowerCase();

      const name =
        lower.split("/").pop() || "";

      /*
       * Explicit test naming conventions
       */

      if (
        name.includes(".test.") ||
        name.includes(".spec.")
      ) {
        return true;
      }

      /*
       * Test directories
       */

      const segments =
        lower.split("/");

      if (
        segments.includes("test") ||
        segments.includes("tests") ||
        segments.includes("__tests__")
      ) {
        return true;
      }

      /*
       * Python unittest / pytest conventions
       */

      if (
        name.startsWith("test_") ||
        name.endsWith("_test.py")
      ) {
        return true;
      }

      return false;
    });

  return {
    testFiles,
    testFileCount:
      testFiles.length,
    detected:
      testFiles.length > 0,
  };
}