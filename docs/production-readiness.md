# Production Readiness Review

## Problem

The repository already had the right platform shape for `LLM DOES NOT COMPUTE`: Vue frontend, Cloudflare edge APIs, D1 for metadata, R2 for artifacts, and an agentic prompt workflow. The main gaps were not missing features so much as architectural drift between the product concept and the implementation.

## Principal Analysis

### What is strong

- The platform is correctly biased toward edge-native primitives: Pages/Worker, D1, R2, scheduled generation.
- The comic workflow already persists prompts, cast selection, topics, and artifacts, which is enough for observability and replay.
- The frontend has the right information architecture: current strip, archive, subscribe, CLI/meta surface.

### What was blocking production readiness

1. Comic transport path was wrong.
   The `today` and `day` APIs were embedding entire image binaries as base64 data URLs in JSON. That inflates payload size, wastes CPU, prevents normal browser caching, and does not scale.

2. The generator was not preserving the comic’s core cast.
   Random cast sampling could omit the User or the Robot entirely, which breaks the strip identity.

3. Push notifications were presented as active even though delivery was still placeholder-grade.
   That is acceptable for local prototyping, not for production.

4. Vote writes were too permissive.
   The system allowed votes against nonexistent comic days and used `INSERT OR REPLACE`, which is less precise than an explicit upsert.

5. Local fallback rendering depended on a remote font.
   That creates an unnecessary runtime dependency in the bootstrap path.

## Changes Applied

### API and delivery

- Added `GET /api/image?day=YYYY-MM-DD&variant=a|b` to stream comic binaries from R2.
- Changed `GET /api/today` and `GET /api/day` to return image paths instead of embedded base64 payloads.
- Added cache headers for `today`, `day`, `archive`, and streamed image responses.
- Added shared helpers for day validation, variant validation, JSON parsing, and cache headers.
- Added deterministic local verification scripts:
  - `scripts/test-api-contracts.mjs`
  - `scripts/smoke-local.sh`

### Domain model and generator quality

- Replaced the generic cast sheet with the recurring strip cast:
  - User
  - LLM Robot
  - Simon
  - Boss
  - Ferris
- Added canonical sample SVGs for the new cast.
- Updated the workflow so every generated strip includes the User and the Robot, with optional extras drawn from Simon/Boss/Ferris.
- Narrowed panel count to `3..4`, which is materially better for setup -> confident nonsense -> correction timing.
- Strengthened the prompt bible so the generator is anchored to the series identity.

### Write-path correctness

- Voting now validates the requested day against an existing comic row.
- Voting now uses an explicit `ON CONFLICT` upsert instead of `INSERT OR REPLACE`.

### Feature gating

- Push registration and push-key retrieval now require `ENABLE_PUSH_NOTIFICATIONS=1`.
- Scheduled push delivery also requires that flag.
- This keeps the feature off until a proper VAPID-compliant sender is in place.

### Local fallback hardening

- Removed the remote font dependency from the SVG renderer.
- Updated Simon’s fallback drawing to match the fedora/goatee definition.

### Build reproducibility and bundle control

- Removed stale GitHub-only frontend dependencies that were blocking a clean install.
- Added `wrangler` as a dev dependency so local Pages/D1 workflows are repo-scoped instead of machine-scoped.
- Fixed `tsconfig.json` type resolution so package types resolve normally.
- Lazy-loaded tab content and the 3D logo path.
- Split `three` and terminal code into dedicated chunks so the initial entry bundle is materially smaller.

## Remaining Work Before Wide Production Traffic

1. Add schema migration support instead of relying only on `schema.sql`.

2. Replace the placeholder web-push sender with a proper VAPID implementation or keep push disabled.

3. Add abuse controls:
   - rate limiting for `/api/vote`
   - tighter auth and audit around `/api/test-generate`

4. Add CI execution for:
   - `npm run build`
   - `node --experimental-strip-types scripts/test-api-contracts.mjs`
   - `./scripts/smoke-local.sh`

5. Evaluate whether the deferred `three` vendor chunk should be reduced further, or whether its current lazy-loaded size is acceptable.

## Architecture Direction

The right long-term structure is:

- D1 stores comic metadata, vote state, workflow lineage.
- R2 stores binary artifacts and workflow artifacts.
- The API returns metadata and stable URLs, not embedded assets.
- The prompt workflow enforces a stable comic bible and lets topic variation happen inside that constraint.
- Any feature that is not truly production-grade stays feature-gated until it is.
