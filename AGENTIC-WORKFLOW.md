# Agentic Graphic Workflow

This repo now supports an agentic comic workflow that produces **graphic** comic variants (not SVG text strips) using Cloudflare Workers AI.

## Models

- Required: `@cf/bytedance/stable-diffusion-xl-lightning` (variant A)
- Default variant B: `@cf/black-forest-labs/flux-1-schnell`
- Topic planner model: `@cf/meta/llama-3.1-8b-instruct`

Model IDs can be overridden with env vars:

- `IMAGE_MODEL_A`
- `IMAGE_MODEL_B`
- `TOPIC_MODEL`

## Workflow Steps

1. Randomly select panel count (`1..4`).
2. Randomly select cast size and cast members from `cast/characters.json`.
3. Suggest 3 topics (Workers AI topic model with deterministic fallback).
4. Build a standard graphic-generation prompt for each variant.
5. Generate two image variants via Workers AI.
6. Persist outputs and artifacts:
   - Images: `comics/<day>/a.png`, `comics/<day>/b.png`
   - Artifacts: `artifacts/<day>/<run-id>/...`
7. Persist workflow metadata in D1 (`workflow_runs` table).

## Local Testing

### 1) Build frontend

```bash
npm run build
```

### 2) Initialize local D1 schema

```bash
npm run db:init:local
```

### 3) Start local Pages runtime

```bash
npx wrangler pages dev dist --ip 127.0.0.1 --port 8788 -b TEST_SECRET=local-secret
```

### 4) Test prompt generator only (no AI binding required)

```bash
curl -X POST \
  -H "Authorization: Bearer local-secret" \
  -H "Content-Type: application/json" \
  -d '{"dry_run":"1"}' \
  http://127.0.0.1:8788/api/test-generate
```

### 5) Test real graphic generation (requires Workers AI binding)

Use an environment where `env.AI` is bound.

Local with remote AI binding requires a Cloudflare API token:

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
npx wrangler pages dev dist --ip 127.0.0.1 --port 8788 --ai AI
```

Then call:

```bash
curl -X POST \
  -H "Authorization: Bearer local-secret" \
  -H "Content-Type: application/json" \
  -d '{"force":"1"}' \
  http://127.0.0.1:8788/api/test-generate
```

## Useful Endpoints

- `GET /api/today`
- `GET /api/day?day=YYYY-MM-DD`
- `GET /api/archive?page=1&limit=20`
- `GET /api/workflow?day=YYYY-MM-DD&include_artifacts=1`
- `POST /api/test-generate`
