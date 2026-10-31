#!/bin/sh
# om-prepare-test-env: generated entrypoint (contract v2)
# history:
#   2026-10-31 generated for scoped teardown of the disposable QA environment
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
DESCRIPTOR="$ROOT/.ai/qa/test-env.json"
[ -f "$DESCRIPTOR" ] || exit 0
[ "$(jq -r '.startedByThisRepo // false' "$DESCRIPTOR")" = "true" ] || exit 0
APP_PID=$(jq -r '.app.pid // empty' "$DESCRIPTOR")
[ -z "$APP_PID" ] || kill -TERM "-$APP_PID" 2>/dev/null || kill -TERM "$APP_PID" 2>/dev/null || true
for container in $(jq -r '.services[].container // empty' "$DESCRIPTOR"); do
  case "$container" in devmentor-qa-*) docker rm -f "$container" >/dev/null 2>&1 || true ;; esac
done
jq '.status = "stopped"' "$DESCRIPTOR" > "$DESCRIPTOR.tmp"
mv "$DESCRIPTOR.tmp" "$DESCRIPTOR"
printf 'TEST_ENV_STATUS=stopped\nTEST_ENV_DESCRIPTOR=.ai/qa/test-env.json\n'
