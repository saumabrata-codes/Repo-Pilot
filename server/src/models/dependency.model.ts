export interface DependencyInfo {
  name: string;
  version: string;
  type: "runtime" | "development";
  source:
    | "package.json"
    | "requirements.txt"
    | "pom.xml"
    | "go.mod"
    | "Cargo.toml";
}