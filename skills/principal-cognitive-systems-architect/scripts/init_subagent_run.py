#!/usr/bin/env python3
"""Initialize artifact scaffolding for a delegated sub-agent run."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_AGENTS = [
    "spec-audit",
    "repo-analyst",
    "planner",
    "implementer",
    "validator",
    "cost-guard",
]


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def make_run_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"run-{stamp}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Initialize a sub-agent run scaffold.")
    parser.add_argument("--task", required=True, help="Problem statement for this run")
    parser.add_argument(
        "--agents",
        default=",".join(DEFAULT_AGENTS),
        help="Comma-separated list of agents to include",
    )
    parser.add_argument(
        "--out",
        default=".agent-runs",
        help="Directory where run artifacts will be created",
    )
    args = parser.parse_args()

    agents = [item.strip() for item in args.agents.split(",") if item.strip()]
    if not agents:
        raise SystemExit("At least one agent is required")

    run_id = make_run_id()
    root = Path(args.out).resolve() / run_id
    logs_dir = root / "logs"
    results_dir = root / "results"
    logs_dir.mkdir(parents=True, exist_ok=False)
    results_dir.mkdir(parents=True, exist_ok=False)

    run_data = {
        "run_id": run_id,
        "created_at": iso_now(),
        "task": args.task,
        "status": "in_progress",
        "agents": [
            {
                "name": name,
                "status": "pending",
                "inputs": [],
                "outputs": [],
                "risks": [],
                "next_step": "",
            }
            for name in agents
        ],
        "validation": {
            "commands": [],
            "result": "pending",
        },
        "final_risks": [],
        "rollback_notes": [],
    }

    (root / "run.json").write_text(json.dumps(run_data, indent=2) + "\n", encoding="utf-8")
    (root / "notes.md").write_text("# Notes\n\n", encoding="utf-8")

    for name in agents:
        template = "\n".join(
            [
                f"# {name}",
                "",
                "inputs:",
                "actions:",
                "outputs:",
                "risks:",
                "next_step:",
                "",
            ]
        )
        (logs_dir / f"{name}.md").write_text(template, encoding="utf-8")

    print(str(root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
