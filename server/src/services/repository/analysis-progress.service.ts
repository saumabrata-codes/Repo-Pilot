export type AnalysisStatus =
  | "queued"
  | "downloading"
  | "extracting"
  | "scanning"
  | "analyzing"
  | "building_snapshot"
  | "completed"
  | "failed";

export interface AnalysisProgress {
  repositoryId: string;
  status: AnalysisStatus;
  progress: number;
  stage: string;
  message: string;
  error?: string;
  updatedAt: string;
}

const progressStore = new Map<string, AnalysisProgress>();

export function createAnalysisProgress(
  repositoryId: string
): AnalysisProgress {
  const progress: AnalysisProgress = {
    repositoryId,
    status: "queued",
    progress: 0,
    stage: "queued",
    message: "Repository analysis queued",
    updatedAt: new Date().toISOString(),
  };

  progressStore.set(repositoryId, progress);

  return progress;
}

export function updateAnalysisProgress(
  repositoryId: string,
  update: Partial<
    Omit<AnalysisProgress, "repositoryId" | "updatedAt">
  >
): AnalysisProgress {
  const existing = progressStore.get(repositoryId);

  if (!existing) {
    throw new Error(
      `Analysis progress not found: ${repositoryId}`
    );
  }

  const updated: AnalysisProgress = {
    ...existing,
    ...update,
    updatedAt: new Date().toISOString(),
  };

  progressStore.set(repositoryId, updated);

  return updated;
}

export function getAnalysisProgress(
  repositoryId: string
): AnalysisProgress | undefined {
  return progressStore.get(repositoryId);
}