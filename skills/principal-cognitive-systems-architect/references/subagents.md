# Sub-Agent Contracts

Use these contracts to avoid vague delegation.

## Shared Output Schema

Every sub-agent returns:

```text
inputs:
actions:
outputs:
risks:
next_step:
```

## spec-audit

Purpose: Convert request into explicit requirements, invariants, and edge cases.

Inputs:
- user request
- constraints
- current behavior summary

Output requirements:
- acceptance criteria checklist
- edge-case list
- non-goals

Done when:
- acceptance criteria are testable and unambiguous.

## repo-analyst

Purpose: Find exact code touchpoints, data flows, and dependency impacts.

Inputs:
- acceptance criteria
- repository tree

Output requirements:
- files to change
- interfaces/contracts affected
- regression hotspots

Done when:
- all touched modules and risks are enumerated.

## planner

Purpose: Build execution DAG with dependencies and validation steps.

Inputs:
- requirements + impact map

Output requirements:
- ordered task list
- per-task owner
- validation command for each task

Done when:
- sequence is executable without hidden dependencies.

## implementer

Purpose: Apply minimal, targeted code changes.

Inputs:
- assigned task slice
- target files

Output requirements:
- patch summary
- assumptions
- follow-up items

Done when:
- task passes local checks for its scope.

## validator

Purpose: Confirm behavior, prevent regressions, and log evidence.

Inputs:
- changed files
- expected outcomes

Output requirements:
- commands run
- pass/fail per check
- reproducible failure details

Done when:
- checks are green or failures are fully triaged.

## cost-guard

Purpose: Reduce token/tool/model waste while preserving correctness.

Inputs:
- current plan
- execution logs

Output requirements:
- removed redundant steps
- compressed context plan
- model/tool cost notes

Done when:
- no obvious redundant reads, retries, or expensive escalations remain.
