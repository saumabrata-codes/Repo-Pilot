export interface FrameworkInfo {
  name: string;

  category:
    | "frontend"
    | "backend"
    | "fullstack"
    | "testing"
    | "other";

  evidence: string[];
}

const FRAMEWORKS: Record<
  string,
  {
    name: string;
    category: FrameworkInfo["category"];
  }
> = {
  /*
   * ----------------------------------------
   * JAVASCRIPT / TYPESCRIPT
   * ----------------------------------------
   */

  react: {
    name: "React",
    category: "frontend",
  },

  next: {
    name: "Next.js",
    category: "fullstack",
  },

  vue: {
    name: "Vue",
    category: "frontend",
  },

  angular: {
    name: "Angular",
    category: "frontend",
  },

  express: {
    name: "Express",
    category: "backend",
  },

  fastify: {
    name: "Fastify",
    category: "backend",
  },

  "@nestjs/core": {
    name: "NestJS",
    category: "backend",
  },

  /*
   * ----------------------------------------
   * TESTING
   * ----------------------------------------
   */

  vitest: {
    name: "Vitest",
    category: "testing",
  },

  jest: {
    name: "Jest",
    category: "testing",
  },

  /*
   * ----------------------------------------
   * PYTHON
   * ----------------------------------------
   */

  flask: {
    name: "Flask",
    category: "backend",
  },

  fastapi: {
    name: "FastAPI",
    category: "backend",
  },

  django: {
    name: "Django",
    category: "backend",
  },

  streamlit: {
    name: "Streamlit",
    category: "frontend",
  },

  gradio: {
    name: "Gradio",
    category: "frontend",
  },
};

export function detectFrameworks(
  dependencies: {
    name: string;
    source?: string;
  }[]
): FrameworkInfo[] {
  const results: FrameworkInfo[] = [];

  const detectedNames =
    new Set<string>();

  for (const dependency of dependencies) {
    const dependencyName =
      dependency.name.toLowerCase();

    const framework =
      FRAMEWORKS[dependencyName];

    if (!framework) {
      continue;
    }

    if (
      detectedNames.has(
        framework.name
      )
    ) {
      continue;
    }

    detectedNames.add(
      framework.name
    );

    results.push({
      name: framework.name,
      category:
        framework.category,
      evidence: [
        dependency.source
          ? `${dependency.source}: ${dependency.name}`
          : `Dependency: ${dependency.name}`,
      ],
    });
  }

  return results;
}