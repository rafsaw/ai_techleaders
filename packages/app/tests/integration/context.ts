import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
export const integrationResultsDirectory = join(repositoryRoot, "test-results/integration");
export const browserExecutable = join(repositoryRoot, "node_modules/.bin/agent-browser");

declare module "vitest" {
  export interface ProvidedContext {
    baseURL: string;
    databaseURL: string;
    /** Base URL of the local GitHub stub (OAuth and API). */
    githubStubURL: string;
    /** `SMTP_URL` of the integration Mailpit, as the app under test uses it. */
    smtpURL: string;
    /** Base URL of the integration Mailpit's HTTP API. */
    mailpitURL: string;
    browserSession: string;
    integrationArtifactsDirectory: string;
  }
}
