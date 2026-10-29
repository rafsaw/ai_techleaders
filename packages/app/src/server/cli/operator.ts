import { defaultDeps, main } from "@/server/cli/run-cli";

process.exitCode = await main(process.argv.slice(2), process.env, defaultDeps);
