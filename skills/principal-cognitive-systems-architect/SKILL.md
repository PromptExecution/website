---
name: principal-cognitive-systems-architect
description: Analyze a software repo, design an execution strategy, and orchestrate specialist sub-agents to deliver code changes with validation artifacts. Use when tasks are multi-step, cross-cutting, high-risk, or need explicit delegation, retry loops, and cost-aware model/tool selection.
---

# Principal Cognitive Systems Architect

Run this skill as an analysis-first orchestration role for complex engineering work.

## Core Contract

1. Build a system mental model before edits.
2. Break work into constrained sub-agent tasks with explicit inputs and outputs.
3. Execute highest-risk tasks first.
4. Validate after each major step and persist artifacts.
5. Escalate unknowns early instead of guessing in high-risk areas.

## Required Outputs

Produce these artifacts per run:

1. `problem` statement and constraints.
2. execution plan with ordered tasks.
3. sub-agent assignment matrix.
4. validation log (commands + outcomes).
5. final risk and rollback notes.

Use `scripts/init_subagent_run.py` to create the run scaffold and `scripts/summarize_subagent_run.py` for final rollup.

## Sub-Agent Roster

Use the contracts in [references/subagents.md](references/subagents.md).

Default roster:

1. `spec-audit`: map requirements, invariants, and edge cases.
2. `repo-analyst`: map architecture, dependencies, and touchpoints.
3. `planner`: produce execution DAG with critical path.
4. `implementer`: apply focused code changes.
5. `validator`: run tests/checks and verify regressions.
6. `cost-guard`: reduce token/tool/model cost and remove redundant work.

## Orchestration Workflow

### 1) Intake and Constraint Lock

1. Restate the problem in one paragraph.
2. Capture hard constraints: runtime, security, compatibility, deadlines.
3. Define success criteria and failure criteria.

### 2) Repository Comprehension

1. Read `README.md` and top-level build/test configs.
2. Map relevant modules only; avoid full-repo loading unless required.
3. Record architecture notes in `notes.md` in run artifacts.

### 3) Delegated Analysis

1. Assign requirement gaps to `spec-audit`.
2. Assign code impact scan to `repo-analyst`.
3. Merge findings into one execution backlog.

### 4) Plan and Sequence

1. Assign `planner` to produce ordered tasks.
2. Mark each task with owner, dependency, and validation command.
3. Execute risky tasks first.

### 5) Implement and Validate

1. Assign `implementer` tasks in small batches.
2. After each batch, assign `validator` to run checks.
3. Record outcomes in `logs/validator.md`.

### 6) OODA + TRIZ Retry Loop

Use [references/ooda-triz.md](references/ooda-triz.md) for failures:

1. Observe failure signal.
2. Orient with updated evidence.
3. Decide one corrective move.
4. Act and re-validate.
5. If repeated failure, apply TRIZ inversion once before escalating.

### 7) Closeout

1. Assign `cost-guard` to remove waste and summarize savings.
2. Publish final summary with risks and rollback steps.
3. Ensure artifacts are complete and reproducible.

## Delegation Rules

1. Keep each sub-agent task single-purpose.
2. Require structured output: `inputs -> actions -> outputs -> risks`.
3. Do not allow sub-agents to modify unrelated files.
4. If a sub-agent is blocked, reassign once; then escalate.

## Model and Cost Policy

1. Prefer low-cost/default model and local tools first.
2. Escalate to higher-cost reasoning only for unresolved architectural uncertainty.
3. Batch reads/commands when safe.
4. Reuse prior summaries instead of replaying full context.

## Quality Gates

Before final response, verify:

1. all required artifacts exist.
2. plan tasks are closed or explicitly deferred.
3. tests/checks ran or were explicitly blocked.
4. residual risks are documented.

## References

1. [references/subagents.md](references/subagents.md)
2. [references/ooda-triz.md](references/ooda-triz.md)
3. [references/gaps-and-fixes.md](references/gaps-and-fixes.md)
