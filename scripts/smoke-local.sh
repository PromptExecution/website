#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8788}"
BASE_URL="http://${HOST}:${PORT}"
LOG_FILE="$(mktemp)"
TODAY_JSON="$(mktemp)"
VOTE_JSON="$(mktemp)"
ARCHIVE_JSON="$(mktemp)"

SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  rm -f "${LOG_FILE}" "${TODAY_JSON}" "${VOTE_JSON}" "${ARCHIVE_JSON}"
}

trap cleanup EXIT

echo "[smoke] building frontend"
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  npm run build >/dev/null
else
  echo "[smoke] skipping build because SKIP_BUILD=1"
fi

echo "[smoke] resetting local wrangler state"
rm -rf .wrangler/state/v3

echo "[smoke] initializing local D1 schema"
npm run db:init:local >/dev/null

echo "[smoke] starting wrangler pages dev on ${BASE_URL}"
npx wrangler pages dev dist \
  --ip "${HOST}" \
  --port "${PORT}" \
  -b TEST_SECRET=local-secret \
  -b AUTO_GENERATE_ON_READ=1 \
  -b ALLOW_LOCAL_BOOTSTRAP=1 \
  >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/api/archive" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "${BASE_URL}/api/archive" >/dev/null 2>&1; then
  echo "[smoke] worker failed to start" >&2
  cat "${LOG_FILE}" >&2
  exit 1
fi

echo "[smoke] validating /api/today"
curl -fsS "${BASE_URL}/api/today" >"${TODAY_JSON}"
python3 - "${TODAY_JSON}" <<'PY'
import json
import sys

payload = json.load(open(sys.argv[1], encoding="utf-8"))
assert payload["day"], "missing day"
assert payload["title"], "missing title"
for variant in ("a", "b"):
    data = payload["variants"][variant]
    assert data["imageUrl"].startswith("/api/image?"), f"unexpected imageUrl for {variant}: {data['imageUrl']}"
    assert isinstance(data["votes"], int), f"votes not int for {variant}"
print(payload["day"])
print(payload["variants"]["a"]["imageUrl"])
PY

DAY="$(python3 - "${TODAY_JSON}" <<'PY'
import json
import sys
payload = json.load(open(sys.argv[1], encoding="utf-8"))
print(payload["day"])
PY
)"

IMAGE_URL="$(python3 - "${TODAY_JSON}" <<'PY'
import json
import sys
payload = json.load(open(sys.argv[1], encoding="utf-8"))
print(payload["variants"]["a"]["imageUrl"])
PY
)"

echo "[smoke] validating streamed image ${IMAGE_URL}"
IMAGE_HEADERS="$(curl -fsS -D - -o /dev/null "${BASE_URL}${IMAGE_URL}")"
grep -qi '^content-type: image/' <<<"${IMAGE_HEADERS}" || {
  echo "[smoke] expected image content-type, got:" >&2
  echo "${IMAGE_HEADERS}" >&2
  exit 1
}

echo "[smoke] validating vote upsert semantics"
curl -fsS -X POST "${BASE_URL}/api/vote" \
  -H 'Content-Type: application/json' \
  -d "{\"day\":\"${DAY}\",\"variant\":\"a\"}" >"${VOTE_JSON}"
python3 - "${VOTE_JSON}" <<'PY'
import json
import sys
payload = json.load(open(sys.argv[1], encoding="utf-8"))
assert payload["success"] is True
assert payload["votes"]["a"] == 1
assert payload["votes"]["b"] == 0
PY

curl -fsS -X POST "${BASE_URL}/api/vote" \
  -H 'Content-Type: application/json' \
  -d "{\"day\":\"${DAY}\",\"variant\":\"b\"}" >"${VOTE_JSON}"
python3 - "${VOTE_JSON}" <<'PY'
import json
import sys
payload = json.load(open(sys.argv[1], encoding="utf-8"))
assert payload["success"] is True
assert payload["votes"]["a"] == 0
assert payload["votes"]["b"] == 1
PY

echo "[smoke] validating archive contract"
curl -fsS "${BASE_URL}/api/archive?page=1&limit=5" >"${ARCHIVE_JSON}"
python3 - "${ARCHIVE_JSON}" <<'PY'
import json
import sys
payload = json.load(open(sys.argv[1], encoding="utf-8"))
assert payload["page"] == 1
assert payload["limit"] == 5
assert payload["total"] >= 1
assert payload["items"], "archive should contain at least one item"
PY

echo "[smoke] validating push is disabled by default"
PUSH_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/api/push-key")"
if [[ "${PUSH_STATUS}" != "404" ]]; then
  echo "[smoke] expected /api/push-key to return 404 when push is disabled, got ${PUSH_STATUS}" >&2
  exit 1
fi

echo "[smoke] all checks passed"
