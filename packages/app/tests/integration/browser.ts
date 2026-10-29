import { execFile } from "node:child_process";
import { appendFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { browserExecutable, repositoryRoot } from "./context";

const execute = promisify(execFile);

type BrowserResponse = { success: boolean; data?: Record<string, unknown>; error?: string };

/**
 * Evidence never carries a raw link token (platform P8): invitation paths
 * (`/invite/<token>`, also percent-encoded inside a `returnTo`) and `token=`
 * query values are replaced before anything reaches `browser.log` or a
 * snapshot capture. agent-browser echoes the URLs it opens and reports, and
 * snapshots list link targets, so this runs on every write.
 */
export function redactTokens(text: string): string {
  return text
    .replace(/(\/|%2F)invite(\/|%2F)[A-Za-z0-9_~.%-]+/gi, "$1invite$2[redacted]")
    .replace(/([?&]|%3F|%26)token(=|%3D)[A-Za-z0-9_~.%-]+/gi, "$1token$2[redacted]");
}

/** Execute the installed agent-browser CLI without a shell or shared browser session. */
export class IntegrationBrowser {
  constructor(private readonly session: string, private readonly artifactsDirectory: string) {}

  async command(...arguments_: string[]): Promise<Record<string, unknown>> {
    const args = ["--session", this.session, "--json", ...arguments_];
    try {
      const { stdout, stderr } = await execute(browserExecutable, args, {
        cwd: repositoryRoot,
        timeout: 30_000,
        killSignal: "SIGKILL",
        maxBuffer: 8 * 1024 * 1024,
      });
      await appendFile(join(this.artifactsDirectory, "browser.log"), redactTokens(`${JSON.stringify(arguments_)}\n${stdout}${stderr}\n`));
      const response = JSON.parse(stdout) as BrowserResponse;
      if (!response.success) throw new Error(response.error ?? "agent-browser command failed");
      return response.data ?? {};
    } catch (error) {
      const output = error as Error & { stdout?: string; stderr?: string };
      await appendFile(join(this.artifactsDirectory, "browser.log"), redactTokens(`${JSON.stringify(arguments_)} failed: ${output.message}\n${output.stdout ?? ""}${output.stderr ?? ""}\n`));
      throw error;
    }
  }

  async snapshot(): Promise<string> {
    const result = await this.command("snapshot");
    if (typeof result.snapshot !== "string") throw new Error("agent-browser returned an invalid accessibility snapshot");
    return result.snapshot;
  }

  /** `nth` picks one of several same-named elements, in snapshot (document) order, e.g. header vs page Sign out. */
  private async reference(role: string, name: string, nth?: number): Promise<string> {
    // Resolve the current snapshot by accessible role/name every time. Refs are
    // discovered rather than hardcoded, and cannot become stale after navigation.
    const result = await this.command("snapshot");
    if (!result.refs || typeof result.refs !== "object") throw new Error("agent-browser returned invalid element references");
    const matches = Object.entries(result.refs).filter(([, value]: [string, unknown]) => {
      return value && typeof value === "object" && "role" in value && value.role === role && "name" in value && value.name === name;
    });
    // Ref ids are not numbered in document order: order by position in the snapshot.
    const snapshot = String(result.snapshot);
    matches.sort(([a], [b]) => snapshot.indexOf(`[ref=${a}]`) - snapshot.indexOf(`[ref=${b}]`));
    if (nth === undefined && matches.length !== 1) throw new Error(`Expected one ${role} named "${name}", found ${matches.length}. Snapshot:\n${redactTokens(String(result.snapshot))}`);
    const match = matches[nth ?? 0];
    if (!match) throw new Error(`Expected a ${role} named "${name}" at index ${nth}, found ${matches.length}. Snapshot:\n${redactTokens(String(result.snapshot))}`);
    return `@${match[0]}`;
  }

  async heading(name: string): Promise<string> {
    const result = await this.command("get", "text", await this.reference("heading", name));
    if (typeof result.text !== "string") throw new Error("agent-browser did not return heading text");
    return result.text;
  }

  async visible(role: string, name: string): Promise<boolean> {
    const result = await this.command("is", "visible", await this.reference(role, name));
    if (typeof result.visible !== "boolean") throw new Error("agent-browser did not return visibility state");
    return result.visible;
  }

  async click(role: "link" | "button", name: string, { nth }: { nth?: number } = {}): Promise<void> {
    const reference = await this.reference(role, name, nth);
    // agent-browser clicks at the element's coordinates without scrolling, so
    // a target below the fold (a form's submit button) would hit <html>.
    await this.command("scrollintoview", reference);
    await this.command("click", reference);
  }

  async fill(label: string, value: string): Promise<void> {
    await this.command("fill", await this.reference("textbox", label), value);
  }

  /** The current value of the textbox with this accessible name. */
  async value(label: string): Promise<string> {
    const result = await this.command("get", "value", await this.reference("textbox", label));
    if (typeof result.value !== "string") throw new Error("agent-browser did not return a field value");
    return result.value;
  }

  async url(): Promise<string> {
    const result = await this.command("get", "url");
    if (typeof result.url !== "string") throw new Error("agent-browser did not return the URL");
    return result.url;
  }

  /** The session's browser cookies (name, value, expires in epoch seconds, …). */
  async cookies(): Promise<{ name: string; value: string; expires: number }[]> {
    const result = await this.command("cookies", "get");
    if (!Array.isArray(result.cookies)) throw new Error(`agent-browser returned no cookie list: ${JSON.stringify(result)}`);
    return result.cookies as { name: string; value: string; expires: number }[];
  }

  async waitForText(text: string): Promise<void> {
    await this.command("wait", "--text", text);
  }

  async capture(name: string): Promise<void> {
    const safeName = name.replace(/[^a-zA-Z0-9-]/g, "-");
    await writeFile(join(this.artifactsDirectory, `${safeName}.txt`), redactTokens(await this.snapshot()));
    await this.command("screenshot", join(this.artifactsDirectory, `${safeName}.png`), "--full");
  }
}
