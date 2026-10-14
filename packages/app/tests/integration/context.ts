import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
export const integrationResultsDirectory = join(repositoryRoot, "test-results/integration");
export const browserExecutable = join(repositoryRoot, "node_modules/.bin/agent-browser");

declare module "vitest" {
  export interface ProvidedContext {
    baseURL: string;
    browserSession: string;
    integrationArtifactsDirectory: string;
  }
}
