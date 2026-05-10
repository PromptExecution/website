# Notes

## Problem

Stabilize `LLM DOES NOT COMPUTE` as a production-oriented Cloudflare-native comic platform, while reconciling the current repo with the intended recurring cast and strip format.

## Constraints

- Do not disrupt unrelated in-flight user changes in the worktree.
- Preserve the existing Cloudflare Pages/Worker/D1/R2 architecture.
- Prefer hardening and domain alignment over large rewrites.
- Keep incomplete push-delivery behavior out of the production path.

## Architecture Notes

- Frontend: Vue/Vite single-page UI with comic, archive, subscribe, and CLI tabs.
- Edge runtime: `functions/_worker.js` routing API requests and cron.
- Data: D1 for metadata/votes/subscriptions, R2 for comic/image/workflow artifacts.
- Generation: `functions/lib/agentic-comic-workflow.ts` drives topic selection, cast selection, prompts, and Workers AI image generation.
- Bootstrap: local SVG fallback exists for non-AI local runs.

## Key Gaps Observed

1. `today` and `day` embedded full image binaries into JSON.
2. The workflow could omit the core User/Robot pairing.
3. Push delivery was placeholder-grade but presented as available.
4. Voting path accepted nonexistent comic days.
5. Local SVG fallback pulled a remote font.
