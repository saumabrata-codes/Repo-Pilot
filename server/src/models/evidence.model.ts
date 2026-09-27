export interface EvidenceInfo {
  type:
    | "file"
    | "dependency"
    | "configuration"
    | "metadata";

  source: string;

  description: string;
}