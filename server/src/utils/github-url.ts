export interface GitHubRepository {
  owner: string;
  repository: string;
  url: string;
}

export function parseGitHubUrl(input: string): GitHubRepository {
  if (!input || typeof input !== "string") {
    throw new Error("GitHub URL is required");
  }

  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("GitHub URL must use HTTPS");
  }

  if (url.hostname !== "github.com") {
    throw new Error("URL must be a GitHub repository URL");
  }

  const parts = url.pathname
    .split("/")
    .filter(Boolean);

  if (parts.length < 2) {
    throw new Error("Invalid GitHub repository URL");
  }

  const owner = parts[0];
  const repository = parts[1].replace(/\.git$/, "");

  if (!owner || !repository) {
    throw new Error("Could not determine repository owner and name");
  }

  return {
    owner,
    repository,
    url: `https://github.com/${owner}/${repository}`,
  };
}