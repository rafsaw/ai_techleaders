// `npm run check:agents`: fails when a Task Router target is missing or an instruction file is over budget.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkAgents } from "./check-agents/run.mjs";

process.exitCode = checkAgents(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), console.log);
