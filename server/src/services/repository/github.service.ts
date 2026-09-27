export interface GitHubRepositoryMetadata {
  owner: string;
  name: string;
  description: string | null;
  defaultBranch: string;
  visibility: "public" | "private";
  sizeKb: number;
  htmlUrl: string;
}

export async function getRepositoryMetadata(
  owner: string,
  repository: string
): Promise<GitHubRepositoryMetadata> {
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "RepoPilot",
      },
    }
  );

  if (response.status === 404) {
    throw new Error("GitHub repository not found");
  }

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed with status ${response.status}`
    );
  }

  const data = (await response.json()) as {
    owner: {
      login: string;
    };
    name: string;
    description: string | null;
    default_branch: string;
    visibility: string;
    size: number;
    html_url: string;
  };

  return {
    owner: data.owner.login,
    name: data.name,
    description: data.description,
    defaultBranch: data.default_branch,
    visibility:
      data.visibility === "private" ? "private" : "public",
    sizeKb: data.size,
    htmlUrl: data.html_url,
  };
}