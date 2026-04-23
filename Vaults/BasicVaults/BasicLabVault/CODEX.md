# CODEX.md — AIMindVault Codex 지시사항

> 이 파일은 OpenAI Codex VSCode 확장이 세션 시작 시 자동으로 로드한다.
> 세부 규칙은 `.codex/rules/` 에 모듈별로 분리되어 있다.

---

## 역할

이 프로젝트에서 Codex의 역할:
- **구조화·계약 문서·Vault 정리** 전담
- 대량 수정 작업 (태그 정규화, Juggl 블록 삽입 등)
- Claude(Claudian)가 설계한 내용을 문서화·정규화

---

## 세션 시작 순서 (강제)

```
1. 이 파일 (CODEX.md) — 자동 로드됨
2. .codex/rules/never-do.md     ← 반드시 읽을 것
3. _WORKFLOW.md
4. _STATUS.md
5. .codex/AGENT_STATUS.md
```

> 2번을 건너뛰면 인코딩 사고·파일 손상이 재발한다. (과거 2회 발생)

---

## 절대 금지 (즉시 암기)

### 인코딩
```powershell
# 금지 — 한국어 마크다운 깨짐
Get-Content *.md | Set-Content *.md
Get-Content *.md -Raw | ... | Set-Content
Add-Content *.md "..."

# 허용 — UTF-8 고정
$t = [System.IO.File]::ReadAllText($p, [Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($p, $t, [Text.UTF8Encoding]::new($false))
```

### 대량 수정
- 모든 파일 한꺼번에 치환 금지
- 반드시: Dry-run → 3개 샘플 → 시각 확인 → 전체 실행

---

## 편집 완료 게이트 (강제)

모든 노트 편집 후:
```powershell
node ".sync/_tools/cli-node/bin/cli.js" review -r . -s Contents
```
`POST_EDIT_REVIEW_BAD=0` 확인 전 완료 보고 금지.

---

## 규칙 파일 목록

| 파일 | 내용 |
|------|------|
| `.codex/rules/never-do.md` | 절대 금지 목록 (상세) |
| `.codex/rules/note-writing.md` | frontmatter, Juggl 규칙 |
| `.codex/rules/bulk-edit-safety.md` | 대량 수정 5단계 프로토콜 |

## 플레이북 (절차서)

| 파일 | 사용 시점 |
|------|----------|
| `.codex/playbooks/juggl-insert.md` | Juggl 블록 단일/대량 삽입 |
| `.codex/playbooks/session-end.md` | 세션 종료 전 체크리스트 |

---

## 편집 모드 분리 (강제)

모든 편집은 두 모드 중 하나에 속한다. 혼합 금지.

- **`[Domain]` 모드**: `Domain/**` 콘텐츠만 수정. `_Standards/`, `_tools/`, `.claude/`, `.codex/`, vault 루트 파일 수정 금지.
- **`[workspace]` 모드**: 볼트 인프라(`_Standards/`, `_tools/`, `.claude/`, `.codex/`, `Tags/`, vault 루트 파일) 수정. `Domain/**` 본문 콘텐츠 수정 금지.
- 작업 시작 시 모드 선언 필수. 전환 시 명시적 선언.
- 상세 규칙: `_WORKFLOW.md` § 6)

---

## 3대 우선 원칙

1. 규약 확인 > 속도
2. 최소 수정 > 대량 수정
3. 검증 완료 > 빠른 완료 보고

---

## 프로젝트 핵심 경로

| 경로 | 용도 |
|------|------|
| `_WORKFLOW.md` | 전체 운용 규칙 |
| `_STATUS.md` | 현재 진행 상태 |
| `_VAULT-INDEX.md` | 문서 위치 지도 |
| `.codex/AGENT_STATUS.md` | Codex 작업 상태 |
