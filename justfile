set shell := ["bash", "-cu"]

default:
  @just --list

dev:
  @npm run build
  @npm run db:init:local
  @npx wrangler pages dev dist --ip 127.0.0.1 --port 8788 \
    -b TEST_SECRET=local-secret \
    -b AUTO_GENERATE_ON_READ=1 \
    -b ALLOW_LOCAL_BOOTSTRAP=1

dev-ai:
  @npm run build
  @npm run db:init:local
  @npx wrangler pages dev dist --ip 127.0.0.1 --port 8788 --ai AI \
    -b TEST_SECRET=local-secret \
    -b AUTO_GENERATE_ON_READ=1

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

test-workflow:
  @curl -X POST \
    -H "Authorization: Bearer local-secret" \
    -H "Content-Type: application/json" \
    -d '{"force":"1"}' \
    http://127.0.0.1:8788/api/test-generate

test-cron:
  @curl http://127.0.0.1:8790/cdn-cgi/handler/scheduled

architect-init TASK:
  @python3 skills/principal-cognitive-systems-architect/scripts/init_subagent_run.py --task "{{TASK}}"

architect-summary RUN:
  @python3 skills/principal-cognitive-systems-architect/scripts/summarize_subagent_run.py "{{RUN}}" --write
