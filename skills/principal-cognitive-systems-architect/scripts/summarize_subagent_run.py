#!/usr/bin/env python3
"""Summarize a sub-agent run scaffold into a compact markdown report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_run(run_path: Path) -> dict:
    if run_path.is_dir():
        run_file = run_path / "run.json"
        if not run_file.exists():
            candidates = sorted(
                [
                    item / "run.json"
                    for item in run_path.iterdir()
                    if item.is_dir() and (item / "run.json").exists()
                ]
            )
            if candidates:
                run_file = candidates[-1]
    else:
        run_file = run_path
    if not run_file.exists():
        raise FileNotFoundError(f"Run file not found: {run_file}")
    return json.loads(run_file.read_text(encoding="utf-8"))


def build_summary(data: dict) -> str:
    lines = []
    lines.append("# Sub-Agent Run Summary")
    lines.append("")
    lines.append(f"- Run ID: `{data.get('run_id', 'unknown')}`")
    lines.append(f"- Status: `{data.get('status', 'unknown')}`")
    lines.append(f"- Created: `{data.get('created_at', 'unknown')}`")
    lines.append(f"- Task: {data.get('task', 'n/a')}")
    lines.append("")
    lines.append("## Agent Status")
    for agent in data.get("agents", []):
        lines.append(f"- `{agent.get('name', 'unknown')}`: `{agent.get('status', 'pending')}`")

    validation = data.get("validation", {})
    lines.append("")
    lines.append("## Validation")
    lines.append(f"- Result: `{validation.get('result', 'pending')}`")
    commands = validation.get("commands", [])
    if commands:
        lines.append("- Commands:")
        for cmd in commands:
            lines.append(f"  - `{cmd}`")
    else:
        lines.append("- Commands: none recorded")

    risks = data.get("final_risks", [])
    lines.append("")
    lines.append("## Residual Risks")
    if risks:
        for risk in risks:
            lines.append(f"- {risk}")
    else:
        lines.append("- none recorded")

    rollback = data.get("rollback_notes", [])
    lines.append("")
    lines.append("## Rollback Notes")
    if rollback:
        for item in rollback:
            lines.append(f"- {item}")
    else:
        lines.append("- none recorded")

    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Summarize a sub-agent run")
    parser.add_argument("run", help="Path to run directory or run.json")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write summary.md next to run.json",
    )
    args = parser.parse_args()

    run_path = Path(args.run).resolve()
    data = load_run(run_path)
    summary = build_summary(data)

    if args.write:
        out_dir = run_path if run_path.is_dir() else run_path.parent
        out_file = out_dir / "summary.md"
        out_file.write_text(summary, encoding="utf-8")
        print(str(out_file))
    else:
        print(summary)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
