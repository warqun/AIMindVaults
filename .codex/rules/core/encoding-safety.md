# 인코딩 안전 강제 규칙

> 모든 볼트에 동일 적용. 2026-03-04 Incident 기반.

## 필수 규칙

- `Contents` 대량 수정 전 반드시 인코딩 검증을 먼저 실행한다.
- 대량 수정 스크립트는 UTF-8 고정 I/O만 허용한다.
- 수정 후 `BAD_COUNT=0` 확인 전에는 후속 자동화 작업을 실행하지 않는다.

## Incident Rule: Mojibake Prevention (Mandatory)

- Never rewrite Korean markdown with Get-Content + Set-Content pipeline.
- Use only UTF-8 fixed .NET I/O for full-file edits.
- Prefer line-local patch edits; avoid full file rewrite.
- If mojibake appears, stop immediately, restore from Obsidian snapshot, then retry with safe method.

## Incident Rule: Bulk Replace Safety (Mandatory)

- Never run global markdown rewrites on all notes at once.
- Use staged rollout: dry-run → 3-file sample → full run.
- For Juggl edits, modify only inside fenced `juggl ... ` block scope.
- Validate invariants (local count, fenced block integrity, frontmatter integrity) before and after run.
- If corruption signs appear, stop, snapshot-restore, then retry with safer parser logic.
