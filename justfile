set shell := ["bash", "-cu"]

default:
  @just --list

dev:
  @npm run build
  @npm run db:init:local
  @npx wrangler pages dev dist --ip 127.0.0.1 --port 8788 -b TEST_SECRET=local-secret

dev-cron:
  @npm run db:init:local
  @npx wrangler dev --ip 127.0.0.1 --port 8790

dev-ui:
  @npm run dev

build:
  @npm run build

test-workflow-dry:
  @curl -X POST \
    -H "Authorization: Bearer local-secret" \
    -H "Content-Type: application/json" \
    -d '{"dry_run":"1"}' \
    http://127.0.0.1:8788/api/test-generate

test-cron:
  @curl http://127.0.0.1:8790/cdn-cgi/handler/scheduled
