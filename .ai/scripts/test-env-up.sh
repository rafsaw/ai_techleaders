#!/bin/sh
# om-prepare-test-env: generated entrypoint (contract v2)
# regenerate with: om-prepare-test-env --regenerate
# history:
#   2026-10-31 generated for the repository's production Next.js + disposable PostgreSQL/Mailpit QA environment
#   2026-10-31 repair: silence expected connection refusals during the bounded application readiness poll
#   2026-10-31 repair: record the installed browser binary's actual version instead of the provider target version
#   2026-10-31 repair: tear down the recorded environment before a forced restart
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
QA_DIR="$ROOT/.ai/qa"
DESCRIPTOR="$QA_DIR/test-env.json"
DOWN="$ROOT/.ai/scripts/test-env-down.sh"
FORCE=0
FORCE_REBUILD=0
for arg in "$@"; do
  [ "$arg" = "--force" ] && FORCE=1
  [ "$arg" = "--force-rebuild" ] && FORCE_REBUILD=1
done
mkdir -p "$QA_DIR"

if [ -f "$DESCRIPTOR" ]; then
  if [ "$FORCE" -eq 0 ]; then
    STATUS=$(jq -r '.status // empty' "$DESCRIPTOR" 2>/dev/null || true)
    APP_PID=$(jq -r '.app.pid // empty' "$DESCRIPTOR" 2>/dev/null || true)
    BASE_URL=$(jq -r '.baseUrl // empty' "$DESCRIPTOR" 2>/dev/null || true)
    SOURCE_HEAD=$(jq -r '.sourceHead // empty' "$DESCRIPTOR" 2>/dev/null || true)
    CURRENT_HEAD=$(git -C "$ROOT" rev-parse HEAD)
    if [ "$STATUS" = "running" ] && [ "$SOURCE_HEAD" = "$CURRENT_HEAD" ] \
      && [ -n "$APP_PID" ] && kill -0 "$APP_PID" 2>/dev/null \
      && curl -fsS --max-time 3 "$BASE_URL" | grep -q DevMentor; then
      printf 'TEST_ENV_STATUS=running\nTEST_ENV_BASE_URL=%s\nTEST_ENV_DESCRIPTOR=.ai/qa/test-env.json\nTEST_ENV_REUSED=1\nBROWSER_PROVIDER=agent-browser\nBROWSER_INSTALLED=1\n' "$BASE_URL"
      exit 0
    fi
  fi
  sh "$DOWN" >/dev/null 2>&1 || true
fi

LOCK="$QA_DIR/test-env.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "Another test-environment bootstrap owns $LOCK" >&2
  exit 1
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT INT TERM

cd "$ROOT"
if [ "$FORCE_REBUILD" -eq 1 ] || [ ! -s packages/app/.next/BUILD_ID ]; then
  npm run build
fi

free_port() {
  node -e 'const n=require("node:net");const s=n.createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})'
}
RUN_ID="$(date -u +%Y%m%d-%H%M%S)-$$"
PG_PORT=$(free_port)
MAIL_SMTP_PORT=$(free_port)
MAIL_HTTP_PORT=$(free_port)
APP_PORT=$(free_port)
PG_CONTAINER="devmentor-qa-pg-$RUN_ID"
MAIL_CONTAINER="devmentor-qa-mail-$RUN_ID"
PG_PASSWORD=$(node -e 'console.log(require("node:crypto").randomUUID())')
DATABASE_URL="postgres://integration:$PG_PASSWORD@127.0.0.1:$PG_PORT/devmentor_qa"
BASE_URL="http://127.0.0.1:$APP_PORT"
APP_PID=""
SUCCESS=0
cleanup_failed() {
  if [ "$SUCCESS" -eq 0 ]; then
    [ -z "$APP_PID" ] || kill -TERM "-$APP_PID" 2>/dev/null || kill -TERM "$APP_PID" 2>/dev/null || true
    docker rm -f "$PG_CONTAINER" "$MAIL_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap 'cleanup_failed; rmdir "$LOCK" 2>/dev/null || true' EXIT INT TERM

docker run -d --rm --name "$PG_CONTAINER" \
  -e POSTGRES_DB=devmentor_qa -e POSTGRES_USER=integration -e POSTGRES_PASSWORD="$PG_PASSWORD" \
  -p "127.0.0.1:$PG_PORT:5432" postgres:17-alpine >/dev/null
docker run -d --rm --name "$MAIL_CONTAINER" \
  -p "127.0.0.1:$MAIL_SMTP_PORT:1025" -p "127.0.0.1:$MAIL_HTTP_PORT:8025" \
  axllent/mailpit:v1.31.6 >/dev/null

attempt=0
until docker exec "$PG_CONTAINER" pg_isready -U integration -d devmentor_qa >/dev/null 2>&1; do
  attempt=$((attempt + 1)); [ "$attempt" -lt 120 ] || { echo "PostgreSQL did not become ready" >&2; exit 1; }; sleep 1
done
attempt=0
until curl -fsS --max-time 2 "http://127.0.0.1:$MAIL_HTTP_PORT/readyz" >/dev/null 2>&1; do
  attempt=$((attempt + 1)); [ "$attempt" -lt 60 ] || { echo "Mailpit did not become ready" >&2; exit 1; }; sleep 1
done

export NODE_ENV=production DATABASE_URL DB_POOL_MIN=0 DB_POOL_MAX=2 DB_DEBUG=false NEXT_TELEMETRY_DISABLED=1
export APP_URL="$BASE_URL" SMTP_URL="smtp://127.0.0.1:$MAIL_SMTP_PORT" MAIL_FROM="DevMentor <no-reply@devmentor.test>"
npm run db:migrate >/dev/null
setsid npm run start -w @devmentor/app -- --hostname 127.0.0.1 --port "$APP_PORT" >"$QA_DIR/test-env-server.log" 2>&1 &
APP_PID=$!
attempt=0
until curl -fsS --max-time 3 "$BASE_URL" 2>/dev/null | grep -q DevMentor; do
  kill -0 "$APP_PID" 2>/dev/null || { echo "Application exited before readiness; see .ai/qa/test-env-server.log" >&2; exit 1; }
  attempt=$((attempt + 1)); [ "$attempt" -lt 120 ] || { echo "Application did not become ready" >&2; exit 1; }; sleep 1
done

BROWSER_BIN=$(command -v agent-browser 2>/dev/null || printf '%s/node_modules/.bin/agent-browser' "$ROOT")
"$BROWSER_BIN" doctor --json >/dev/null
BROWSER_VERSION=$("$BROWSER_BIN" --version 2>/dev/null || echo unknown)
SOURCE_HEAD=$(git rev-parse HEAD)
STARTED_AT=$(date -u +%FT%TZ)
jq -n \
  --arg runId "$RUN_ID" --arg baseUrl "$BASE_URL" --arg sourceHead "$SOURCE_HEAD" \
  --arg pgContainer "$PG_CONTAINER" --arg mailContainer "$MAIL_CONTAINER" \
  --arg databaseUrl "$DATABASE_URL" --arg smtpUrl "$SMTP_URL" --arg mailpitUrl "http://127.0.0.1:$MAIL_HTTP_PORT" \
  --arg browserCommand "$BROWSER_BIN" --arg browserVersion "$BROWSER_VERSION" --arg startedAt "$STARTED_AT" \
  --argjson appPid "$APP_PID" --argjson appPort "$APP_PORT" --argjson pgPort "$PG_PORT" \
  '{version:1,runId:$runId,status:"running",mode:"ephemeral",baseUrl:$baseUrl,sourceHead:$sourceHead,startedByThisRepo:true,
    startScript:".ai/scripts/test-env-up.sh",stopScript:".ai/scripts/test-env-down.sh",
    app:{startCommand:"npm run start -w @devmentor/app",port:$appPort,healthPath:"/",pid:$appPid},
    services:[{type:"postgres",host:"127.0.0.1",port:$pgPort,container:$pgContainer,url:$databaseUrl,env:{DATABASE_URL:$databaseUrl}},
      {type:"mailpit",container:$mailContainer,smtpUrl:$smtpUrl,apiUrl:$mailpitUrl}],
    credentials:[],credentialsFile:".ai/qa/test-env.env",
    browser:{provider:"agent-browser",installed:true,command:$browserCommand,version:$browserVersion,descriptor:".ai/browsers/agent-browser.md",notes:""},
    testRunner:{name:"vitest + agent-browser",config:"packages/app/vitest.integration.config.ts"},platform:"linux",startedAt:$startedAt,
    notes:"Disposable PostgreSQL and Mailpit; create QA identities only through the application invitation flow."}' > "$DESCRIPTOR"
: > "$QA_DIR/test-env.env"
chmod 600 "$QA_DIR/test-env.env"
SUCCESS=1
printf 'TEST_ENV_STATUS=running\nTEST_ENV_BASE_URL=%s\nTEST_ENV_DESCRIPTOR=.ai/qa/test-env.json\nTEST_ENV_REUSED=0\nBROWSER_PROVIDER=agent-browser\nBROWSER_INSTALLED=1\n' "$BASE_URL"
