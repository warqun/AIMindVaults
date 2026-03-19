---
description: 원본 멀티볼트 변경사항을 배포용 멀티볼트에 동기화
---

# 배포 동기화 워크플로우 (sync-distribution)

**목적**: 원본 `C:\AIMindVaults`에서 변경된 배포 반영 대상 파일을 배포용 `C:\SellingVault\Korean\AIMindVaults`에 동기화.

## 사전 조건

- 변경 로그 확인: `AIHubVault/Contents/Project/plan/AIMindVaults_plan/20260317_배포_동기화_규칙.md` 하단 변경 로그에서 "미반영" 항목 확인.

## 단계별 실행

### Step 1: 변경 로그 읽기
- 위 계획서의 변경 로그 테이블에서 `미반영` 상태인 항목을 모두 수집한다.

### Step 2: 반영 기준 확인
- 각 변경 항목이 아래 반영 대상에 해당하는지 검증:
  - `.claude/rules/core/*` (배포 규칙) — `MANIFEST.md` 목록 기준
  - `.claude/commands/core/*` (배포 스킬) — `MANIFEST.md` 목록 기준
  - `.claude/rules/MANIFEST.md`, `.claude/commands/MANIFEST.md` (매니페스트 자체)
  - `.antigravity/workflows/*` (워크플로우)
  - `_Standards/`, `_tools/`, `Juggl_StyleGuide/` (워크스페이스)
  - 루트/볼트 설정 파일 (`CLAUDE.md`, `_WORKFLOW.md` 등)
- **동기화 제외**:
  - `.claude/rules/custom/*`, `.claude/commands/custom/*` (사용자 전용 — 절대 건드리지 않음)
  - `Contents/` 개인 노트, 추가 볼트, `.obsidian/` 설정
  - 배포 관리 전용 파일 (`distribution_sync.md`, `sync-distribution.md`)

### Step 3: 파일 동기화 실행
- 원본 경로의 해당 파일을 배포용 경로의 동일 위치에 복사/덮어쓰기.
- 배포용에만 존재하고 원본에 없는 파일은 삭제하지 않는다 (배포 전용 콘텐츠 보호).
- 신규 파일은 생성, 수정 파일은 덮어쓰기.

### Step 3-1: 삭제 파일 원본 대조 (필수)
- 배포용에서 삭제 상태(`D`)인 파일을 git에 반영하기 전, **반드시 원본에 해당 파일이 존재하는지 확인**한다.
- 원본에 존재하면 → 삭제가 아니라 배포용에서 누락된 것이므로 **원본에서 복사하여 복구**한다.
- 원본에도 없으면 → 실제 삭제 대상이므로 git에 삭제를 반영한다.
- **원본 대조 없이 삭제 파일을 일괄 커밋하지 않는다.**

### Step 4: 볼트 레지스트리 주의
- 루트 `CLAUDE.md`의 볼트 레지스트리는 원본과 배포가 다르다 (배포는 AIHubVault + BasicContentsVault만).
- 볼트 레지스트리 섹션은 동기화하지 않는다.

### Step 5: 변경 로그 갱신
- 동기화 완료된 항목의 상태를 `미반영` → `반영 완료 (YYYY-MM-DD)`로 갱신.
- 사용자에게 반영 결과 보고.
