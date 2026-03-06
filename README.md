# LLM DOES NOT COMPUTE - PromptExecution

Retro comic UI + Cloudflare-native, agentic graphic-comic generation workflow.

## Quick Start

### Local full-stack (Pages Functions + local D1/R2)

```bash
just dev
```

This runs:
1. `npm run build`
2. `npm run db:init:local`
3. `wrangler pages dev dist --ip 127.0.0.1 --port 8788 -b TEST_SECRET=local-secret`

### Local frontend-only UI

```bash
just dev-ui
```

### Dry-run the agentic prompt planner

Keep `just dev` running, then:

```bash
just test-workflow-dry
```

## Required Config

### Wrangler config

`wrangler.toml` contains:
- cron trigger (`0 9 * * *`)
- D1 binding: `DB`
- R2 binding: `COMICS_BUCKET`
- Workers AI binding in production env: `env.production.ai`
- default production model vars (`IMAGE_MODEL_A`, `IMAGE_MODEL_B`, `TOPIC_MODEL`)

### Environment variables

See `.env.example` for full list.

Core values:
- `TEST_SECRET` for `/api/test-generate`
- `IMAGE_MODEL_A` (default `@cf/bytedance/stable-diffusion-xl-lightning`)
- `IMAGE_MODEL_B` (default `@cf/black-forest-labs/flux-1-schnell`)
- `TOPIC_MODEL` (default `@cf/meta/llama-3.1-8b-instruct`)

## Agentic Graphic Workflow

Main implementation:
- `functions/lib/agentic-comic-workflow.ts`

Workflow:
1. Random panel count (`1..4`)
2. Random cast size + cast selection from `cast/characters.json`
3. Three topic suggestions
4. Standardized comic-image prompt generation
5. Two Workers AI image variants (head-to-head)
6. Artifact retention in R2
7. Metadata retention in D1 (`workflow_runs`)

Cast assets:
- Descriptions: `cast/characters.json`
- Reference samples: `public/cast/samples/*.svg`

## API Endpoints

- `GET /api/today`
- `GET /api/day?day=YYYY-MM-DD`
- `GET /api/archive?page=1&limit=20`
- `GET /api/workflow?day=YYYY-MM-DD&include_artifacts=1`
- `POST /api/test-generate`
- `POST /api/vote`
- `POST /api/subscribe`
- `DELETE /api/subscribe`

## Cron / ScheduledEvent Handler

The cron handler is exported in:
- `functions/_worker.js`

Important: a top-level `export async function scheduled(...)` is present so Cron Triggers are handled correctly.

To test scheduled events locally:

```bash
just dev-cron
```

In another terminal:

```bash
just test-cron
```

If AI binding is not configured locally, cron trigger will run and fail with an explicit Workers AI binding error (expected).

## Workers AI notes

Real image generation requires an AI binding (`env.AI`).

For local real-generation testing:
1. set `CLOUDFLARE_API_TOKEN`
2. run:

```bash
npx wrangler pages dev dist --ip 127.0.0.1 --port 8788 --ai AI -b TEST_SECRET=local-secret
```

If no AI binding is present, `dry_run=1` still works for prompt workflow testing.
