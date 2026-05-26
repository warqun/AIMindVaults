#!/usr/bin/env python3
"""Analyze aimv_permission_log.jsonl — frequency analysis + allowlist suggestion.

Reads the JSONL produced by log_permission_request.py and outputs:
  1. Tool name frequency
  2. Bash command prefix frequency (first token)
  3. Edit/Write file path prefix frequency
  4. Suggested settings.local.json `permissions.allow` patterns

Usage:
  python analyze_permission_log.py                      # default analysis
  python analyze_permission_log.py --threshold 3        # only patterns with N+ occurrences
  python analyze_permission_log.py --top 30             # top N patterns
  python analyze_permission_log.py --format allow       # output as JSON allow list
  python analyze_permission_log.py --format json        # full structured output
  python analyze_permission_log.py --log <path>         # custom log path

Source: 2026-04-29 사용자 요청 — 워커 권한 prompt 패턴 식별 + allowlist 보강 자동화.
"""

import argparse
import json
import os
import sys
import tempfile
from collections import Counter
from pathlib import Path


def default_log_path() -> str:
    base = os.environ.get("TEMP") or os.environ.get("TMPDIR") or tempfile.gettempdir()
    return os.path.join(base, "aimv_permission_log.jsonl")


def load_records(log_path: str) -> list[dict]:
    p = Path(log_path)
    if not p.exists():
        return []
    records = []
    with p.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return records


def count_tools(records: list[dict]) -> Counter:
    return Counter(r.get("tool_name") for r in records if r.get("tool_name"))


def count_bash_prefixes(records: list[dict]) -> Counter:
    counts: Counter = Counter()
    for r in records:
        if r.get("tool_name") != "Bash":
            continue
        cmd = r.get("command", "").strip()
        if not cmd:
            continue
        first = cmd.split()[0] if cmd else ""
        if first:
            counts[first] += 1
    return counts


def count_path_prefixes(records: list[dict]) -> Counter:
    counts: Counter = Counter()
    for r in records:
        if r.get("tool_name") not in ("Edit", "Write", "Read"):
            continue
        fp = r.get("file_path", "")
        if not fp:
            continue
        parts = fp.replace("\\", "/").split("/")
        prefix = "/".join(parts[:4]) if len(parts) >= 4 else fp
        counts[prefix] += 1
    return counts


def suggest_allow_patterns(bash_prefixes: Counter, threshold: int) -> list[str]:
    suggestions = []
    for prefix, count in bash_prefixes.most_common():
        if count < threshold:
            break
        suggestions.append(f"Bash({prefix} *)")
    return suggestions


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--log", default=default_log_path())
    parser.add_argument("--threshold", type=int, default=2, help="Minimum occurrence count")
    parser.add_argument("--top", type=int, default=20, help="Top N patterns")
    parser.add_argument("--format", choices=["text", "json", "allow"], default="text")
    args = parser.parse_args()

    records = load_records(args.log)
    if not records:
        print(f"[INFO] No records in {args.log}", file=sys.stderr)
        return 0

    tools = count_tools(records)
    bash_prefixes = count_bash_prefixes(records)
    path_prefixes = count_path_prefixes(records)
    suggestions = suggest_allow_patterns(bash_prefixes, args.threshold)

    if args.format == "json":
        out = {
            "log": args.log,
            "total_records": len(records),
            "tool_frequency": dict(tools.most_common(args.top)),
            "bash_prefix_frequency": dict(bash_prefixes.most_common(args.top)),
            "path_prefix_frequency": dict(path_prefixes.most_common(args.top)),
            "suggested_allow": suggestions,
        }
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return 0

    if args.format == "allow":
        out = {"permissions": {"allow": suggestions}}
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return 0

    # text format
    print(f"=== Permission Log Analysis ===")
    print(f"Log    : {args.log}")
    print(f"Records: {len(records)}")
    print()
    print("[Tool Frequency]")
    for tool, count in tools.most_common(args.top):
        print(f"  {count:>5}  {tool}")
    print()
    print("[Bash Command Prefix Frequency]")
    for prefix, count in bash_prefixes.most_common(args.top):
        print(f"  {count:>5}  {prefix}")
    print()
    print("[File Path Prefix Frequency (Edit/Write/Read)]")
    for prefix, count in path_prefixes.most_common(args.top):
        print(f"  {count:>5}  {prefix}")
    print()
    print(f"[Suggested settings.local.json allow patterns (threshold={args.threshold})]")
    for p in suggestions:
        print(f"  {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
