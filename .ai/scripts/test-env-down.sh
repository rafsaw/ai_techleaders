#!/bin/sh
# om-prepare-test-env: generated entrypoint (contract v2)
# history:
#   2026-10-31 generated for scoped teardown of the disposable QA environment
#   2026-11-01 repair: never signal a stale PID from a stopped or outdated descriptor
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
DESCRIPTOR="$ROOT/.ai/qa/test-env.json"
[ -f "$DESCRIPTOR" ] || exit 0
[ "$(jq -r '.startedByThisRepo // false' "$DESCRIPTOR")" = "true" ] || exit 0
if [ "$(jq -r '.status // empty' "$DESCRIPTOR")" = "stopped" ]; then
  printf 'TEST_ENV_STATUS=stopped\nTEST_ENV_DESCRIPTOR=.ai/qa/test-env.json\n'
  exit 0
fi
APP_PID=$(jq -r '.app.pid // empty' "$DESCRIPTOR")
# After a reboot the recorded PID may belong to something else: signal only our npm/Next server.
if [ -n "$APP_PID" ] && ps -o args= -p "$APP_PID" 2>/dev/null | grep -Eq 'npm|next'; then
  kill -TERM "-$APP_PID" 2>/dev/null || kill -TERM "$APP_PID" 2>/dev/null || true
fi
for container in $(jq -r '.services[].container // empty' "$DESCRIPTOR"); do
  case "$container" in devmentor-qa-*) docker rm -f "$container" >/dev/null 2>&1 || true ;; esac
done
jq '.status = "stopped"' "$DESCRIPTOR" > "$DESCRIPTOR.tmp"
mv "$DESCRIPTOR.tmp" "$DESCRIPTOR"
printf 'TEST_ENV_STATUS=stopped\nTEST_ENV_DESCRIPTOR=.ai/qa/test-env.json\n'
