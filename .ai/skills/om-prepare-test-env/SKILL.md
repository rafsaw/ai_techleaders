# DevMentor test-environment recipe

Apply the installed `om-prepare-test-env` skill. The generated POSIX entrypoints are `.ai/scripts/test-env-up.sh` and `.ai/scripts/test-env-down.sh`.

The working chain is:

1. Reuse a healthy descriptor only when its app PID, HTTP probe, and `sourceHead` all match.
2. Otherwise start scoped disposable `postgres:17-alpine` and `axllent/mailpit:v1.31.6` containers on free loopback ports.
3. Run `npm run db:migrate`, start the existing production build with `npm run start -w @devmentor/app`, and verify `agent-browser` with `doctor --json`.
4. Write `.ai/qa/test-env.json`; stop only its recorded process group and `devmentor-qa-*` containers.

The readiness poll suppresses expected connection-refused output while the production server is starting. This prevents a healthy cold boot from looking degraded in automation logs.

The descriptor records `agent-browser --version` from the binary it actually verifies. A healthy older binary already on `PATH` must never be mislabeled as the descriptor's pinned target version.

A forced restart still tears down the environment recorded in the existing descriptor before replacing it. Skipping that teardown leaks the previous disposable containers and process group because the new descriptor can no longer name them.
