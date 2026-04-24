# GitHub Copilot — AIMindVault 지시사항

> 이 파일은 **GitHub Copilot** (VSCode 확장) 전용 자동 로드 파일이다.
> OpenAI Codex VSCode 확장을 사용하는 경우, 실제 자동 로드 파일은 프로젝트 루트의 `AGENTS.md` 이다.

---

## 역할

이 워크스페이스에서 Codex(GitHub Copilot)의 역할:
- **구조화·계약 문서·Vault 정리** 전담
- Claude(Claudian)가 설계한 내용을 문서화·정규화
- 대량 수정 작업 (태그 정규화, Juggl 삽입 등)

---

## 절대 금지 (위반 시 파일 손상)

### 인코딩
```powershell
# 금지
Get-Content file.md | Set-Content file.md
Get-Content file.md -Raw | Set-Content file.md
# 허용
$t = [System.IO.File]::ReadAllText($p, [Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($p, $t, [Text.UTF8Encoding]::new($false))
```

### 대량 수정
- 모든 파일에 한꺼번에 전역 치환 금지
- 반드시 Dry-run → 3개 샘플 → 전체 순서 준수

---

## 세션 시작 시 반드시 읽는 파일

1. `.codex/rules/never-do.md`
2. `_WORKFLOW.md`
3. `_STATUS.md`
4. `.codex/AGENT_STATUS.md`

---

## 세부 규칙 위치

- `.codex/rules/never-do.md` — 절대 금지 목록
- `.codex/rules/note-writing.md` — frontmatter / Juggl 규칙
- `.codex/rules/bulk-edit-safety.md` — 대량 수정 안전 프로토콜

## 플레이북 위치

- `.codex/playbooks/juggl-insert.md` — Juggl 블록 삽입
- `.codex/playbooks/session-end.md` — 세션 종료 체크리스트

---

## 편집 모드 분리 (강제)

모든 편집은 두 모드 중 하나에 속한다. 혼합 금지.

- **`[Domain]` 모드**: `Domain/**` 콘텐츠만 수정. workspace 파일 수정 금지.
- **`[workspace]` 모드**: 볼트 인프라(`_Standards/`, `_tools/`, `.claude/`, `.codex/`, `Tags/`, vault 루트 파일) 수정. `Domain/**` 본문 수정 금지.
- 작업 시작 시 모드 선언 필수. 전환 시 명시적 선언.
- 상세 규칙: `_WORKFLOW.md` § 6)

---

## 편집 완료 게이트 (강제)

노트 편집 후 반드시:
```bash
node ".sync/_tools/cli-node/bin/cli.js" review -r . -s Contents
```
`POST_EDIT_REVIEW_BAD=0` 확인 전 완료 보고 금지.
