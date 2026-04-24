# CODEX 절대 금지 목록 (최우선 규칙)

> 이 파일은 모든 작업 시작 전에 반드시 읽는다.
> 아래 항목을 위반하면 파일 손상·히스토리 복구 작업이 발생한다.

---

## 🚫 인코딩 금지 (한국어 마크다운)

**절대 사용 금지:**
```powershell
# 금지 — 기본 인코딩으로 한글 깨짐 발생
Get-Content file.md | Set-Content file.md
Get-Content file.md -Raw | ... | Set-Content file.md
Add-Content file.md "..."
```

**반드시 이 방식만 사용:**
```powershell
# 안전 — UTF-8 고정 I/O
$text = [System.IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($false))
```

---

## 🚫 대량 수정 금지 패턴

**절대 사용 금지:**
```powershell
# 금지 — 모든 파일에 한꺼번에 전역 치환
Get-ChildItem Domain/**/*.md | ForEach { ... Set-Content ... }
```

**반드시 이 순서로:**
1. Dry-run (수정 없이 대상 파일 목록 출력만)
2. Sample 3개 파일에만 먼저 적용
3. Obsidian에서 샘플 시각 확인
4. 이상 없을 때 전체 실행
5. aimv review 실행 → BAD_COUNT=0 확인

---

## 🚫 Juggl 블록 금지 패턴

**절대 사용 금지:**
- 전체 마크다운 파일 내 임의 위치에 juggl 블록 삽입
- 기존 juggl 블록 내용 덮어쓰기 (존재하면 스킵)
- `Domain/temp/agent_packets/` 폴더 내 파일에 juggl 삽입

**올바른 위치:** H1 제목 바로 아래 (줄 사이 공백 없이)

---

## 🚫 이슈 노트 금지 패턴

- `ISS_*`, `ISSUE_*` 접두사 사용 금지 → 반드시 `DISS_*` 또는 `SISS_*` 사용
- 이슈 노트 생성 후 시스템 인덱스 미갱신 금지
- 이슈 노트에 frontmatter 없이 생성 금지
- juggl 블록 없이 이슈 노트 생성 금지

---

## 🚫 스크립트 무단 생성 금지

- `_Standards/Core/Script_Registry.md` 확인 없이 새 스크립트 생성 금지
- `_tools/` 폴더에 중복 기능 스크립트 배치 금지
- 스크립트 생성 후 `Script_Registry.md` 미등록 금지
- 경로 하드코딩 금지 — 반드시 스크립트 위치 기반 자동탐지 사용
- 상세 규칙: `_Standards/Core/Script_Creation_Rule.md`

---

## 🚫 일반 금지

- 파일 읽지 않고 수정 금지
- _WORKFLOW.md / _STATUS.md 확인 전 작업 시작 금지
- post-review 통과 전 완료 보고 금지
- _STATUS.md 마스터를 테이블로 직접 채우는 행위 금지 (링크만 유지)
- 세션 종료 전 AGENT_STATUS.md 미갱신 금지

---

> 위반 시 즉시 작업 중단 → 사용자에게 보고 → 복구 후 재시작
