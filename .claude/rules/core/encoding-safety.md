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
- On Windows PowerShell, never pipe Korean source text or here-strings into another process while `$OutputEncoding` is ASCII. This corrupts Hangul into literal `?` before the child process receives it. Unsafe examples: `@' ...한글... '@ | python -`, `echo 한글 | node`, and any `Out-File`/redirect path without explicit UTF-8.
- If a pipe to `python -`, `node -`, or another process is unavoidable, keep the piped program text ASCII-only or first set `$OutputEncoding = [System.Text.UTF8Encoding]::new($false)` and verify with a small Hangul sample. Prefer `apply_patch` or UTF-8 fixed scripts over piping generated Korean content.
- After writing Korean notes, verify both that Hangul still exists and that repeated literal question marks were not introduced:
  - `Korean chars > 0` for files expected to contain Korean.
  - `\?{3,}` count = 0.

## Incident Rule: Bulk Replace Safety (Mandatory)

- Never run global markdown rewrites on all notes at once.
- Use staged rollout: dry-run → 3-file sample → full run.
- For Juggl edits, modify only inside fenced `juggl ... ` block scope.
- Validate invariants (local count, fenced block integrity, frontmatter integrity) before and after run.
- If corruption signs appear, stop, snapshot-restore, then retry with safer parser logic.
