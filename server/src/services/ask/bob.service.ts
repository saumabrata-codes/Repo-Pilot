import { spawn } from "node:child_process";
import path from "node:path";

export interface BobSynthesisInput {
  question: string;
  summary: string;
  relevantFiles: string[];
  evidence: string[];
  flow: string[];
}

export interface BobSynthesisResult {
  answer: string;
  usedBob: boolean;
}

export async function synthesizeWithBob(
  input: BobSynthesisInput
): Promise<BobSynthesisResult> {
  const prompt = buildPrompt(input);

  const workspace = path.resolve(process.cwd(), "..");

  return new Promise((resolve) => {
    const comspec =
      process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe";

    const bob = spawn(
      comspec,
      [
        "/d",
        "/s",
        "/c",
        "bob run --format json --mode ask --max-cost 0.05 --max-turns 1 --disable-mcp --disable-subagents --workspace . --trust --accept-license",
      ],
      {
        cwd: workspace,
        windowsHide: true,
        shell: false,
        env: {
          ...process.env,
          BOB_API_KEY: process.env.BOB_API_KEY,
        },
      }
    );

    let stdout = "";
    let stderr = "";
    let finished = false;

    const finish = (
      result: BobSynthesisResult
    ) => {
      if (finished) {
        return;
      }

      finished = true;
      resolve(result);
    };

    const timeout = setTimeout(() => {
      bob.kill();

      finish({
        answer: input.summary,
        usedBob: false,
      });
    }, 60000);

    bob.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    bob.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    bob.on("error", (error) => {
      clearTimeout(timeout);

      console.error(
        "Bob execution failed:",
        error.message
      );

      finish({
        answer: input.summary,
        usedBob: false,
      });
    });

    bob.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        console.error(
          "Bob exited with code:",
          code
        );

        if (stderr.trim()) {
          console.error(
            "Bob stderr:",
            stderr
          );
        }

        finish({
          answer: input.summary,
          usedBob: false,
        });

        return;
      }

      const answer =
        extractBobAnswer(stdout);

      if (!answer) {
        finish({
          answer: input.summary,
          usedBob: false,
        });

        return;
      }

      finish({
        answer,
        usedBob: true,
      });
    });

    bob.stdin.write(prompt);
    bob.stdin.end();
  });
}

function buildPrompt(
  input: BobSynthesisInput
): string {
  return `
You are the explanation layer for RepoPilot.

Answer the user's repository question ONLY using the repository evidence provided below.

Do not invent files, functions, technologies, behavior, or architecture.

If the evidence is insufficient, say:

"I couldn't find enough repository evidence to answer this confidently."

User question:
${input.question}

Existing repository-grounded summary:
${input.summary}

Relevant files:
${input.relevantFiles
  .map((file) => `- ${file}`)
  .join("\n")}

Repository evidence:
${input.evidence
  .map((item) => `- ${item}`)
  .join("\n")}

Repository flow:
${input.flow
  .map((item) => `- ${item}`)
  .join("\n")}

Write a concise answer for a developer.

Do not mention that you are an AI.
Do not provide information that is not supported by the evidence.
`.trim();
}

function extractBobAnswer(
  output: string
): string | null {
  try {
    const parsed = JSON.parse(output);

    if (
      typeof parsed?.last_message ===
      "string"
    ) {
      return parsed.last_message.trim();
    }

    if (
      parsed?.message &&
      typeof parsed.message.content ===
        "string"
    ) {
      return parsed.message.content.trim();
    }

    if (
      typeof parsed?.content ===
      "string"
    ) {
      return parsed.content.trim();
    }
  } catch {
    const cleaned = output.trim();

    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  return null;
}