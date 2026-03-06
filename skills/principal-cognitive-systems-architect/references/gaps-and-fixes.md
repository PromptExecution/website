# Gap Audit and Fixes

## Gap 1: Trigger ambiguity

Issue:
- Original spec did not define concrete trigger conditions.

Fix:
- Added explicit frontmatter description with when-to-use criteria (multi-step, cross-cutting, high-risk tasks).

## Gap 2: Missing delegation contracts

Issue:
- Agent list existed but with no stable handoff schema.

Fix:
- Added formal sub-agent contracts and shared output schema in `subagents.md`.

## Gap 3: No success/failure criteria

Issue:
- Workflow described intent but not completion gates.

Fix:
- Added required outputs and quality gates in SKILL.md.

## Gap 4: Retry loop lacked stop rules

Issue:
- OODA/TRIZ loop had no bounded retries.

Fix:
- Added stop rules and escalation protocol in `ooda-triz.md`.

## Gap 5: No artifact retention mechanism

Issue:
- Spec requested logs/artifacts but provided no structure.

Fix:
- Added scripts that generate and summarize run artifacts.

## Gap 6: Cost policy was aspirational

Issue:
- Mentioned model efficiency without enforceable checks.

Fix:
- Added `cost-guard` sub-agent and required cost notes in closeout.

## Gap 7: Incomplete operational tooling

Issue:
- No command-level bridge for planning/execution/summary.

Fix:
- Added script entry points and `just` targets for repeatable orchestration.
