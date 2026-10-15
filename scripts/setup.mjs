// `npm run setup`: idempotent local setup. See .ai/specs/implemented/2026-10-14-npm-run-setup.md.
import { runSetup } from "./setup/run.mjs";
import { createContext, steps } from "./setup/steps.mjs";

process.exitCode = runSetup(steps, createContext(), console.log);
