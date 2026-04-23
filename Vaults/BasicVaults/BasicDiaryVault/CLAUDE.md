---
type: guide
tags:
  - BasicDiaryVault
  - Template
  - Multi-Hub
  - Diary
updated: 2026-04-22
agent: claude
---

# BasicDiaryVault — Diary Preset 클론 템플릿

> **이 볼트는 Diary Preset Hub (`AIHubVault_Diary`) 용 위성 클론 소스 템플릿이다.**
> 직접 콘텐츠 작업 금지. 사용자가 일기용 위성 볼트를 만들 때 `MakeCloneVault.bat` 가 이 폴더를 복사해 새 볼트를 생성한다.

## 볼트명이 BasicDiaryVault인 경우

복제 소스 템플릿 — 편집 대상 아님.

- 사용 시점: `C:/AIMindVaults/Vaults/BasicVaults/MakeCloneVault.bat` 실행 → Diary Hub 선택 → CLI 가 이 볼트를 source 로 새 위성 생성.
- Hub 바인딩: 클론 후 위성은 `AIHubVault_Diary` 에 rebase 되어 Core 6 + Custom 4 (Calendar, Periodic Notes, Heatmap Calendar, Journal Review) 플러그인만 남음.
- 이 볼트 자체는 Hub 가 아니다. `.sync/hub-marker.json` · `.sync/hub-source.json` 생성 금지.
- 스펙: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260420_Diary_Hub_명세.md`

## 볼트명이 BasicDiaryVault가 아닌 경우

이 볼트는 Diary 템플릿을 복제해 만든 일기용 위성이다. **첫 세션에서 아래를 수행한다:**

1. 이 CLAUDE.md 의 제목·역할·태그를 실제 볼트 이름에 맞춰 수정
2. `_STATUS.md` 의 역할 블록도 동일하게 수정
3. 루트 `_STATUS.md` 볼트 레지스트리에 이 위성 등록 (미등록 시)
4. Periodic Notes 설정에서 Daily folder = `Contents/Daily/{{year}}` 확인
5. Templater 설정에서 템플릿 폴더 = `_Templates` 확인
6. QuickAdd 는 per-device 설정. 사용자가 직접 매크로 구성

## 일기 볼트 고유 원칙 (Diary 스펙 준수)

- **AI scope 기본 `none`** — daily note 원문은 AI 에 전송 금지.
- **주간 요약만 `ai_scope: summary`** — 사용자 본인이 redact 후 제공.
- **AI 단독 생성 노트는 `Contents/_AI_Drafts/` 격리** — 승인 전 사용자 콘텐츠 폴더로 이동 금지.
- **git 없음** — obsidian-git 제거됨. 백업은 OS 암호화 볼륨 기반.
- **sync 제외 옵션** — 프라이버시가 필요하면 이 볼트를 `aimv sync` 대상에서 빼는 것을 고려.
- **Frontmatter 최소 유지** — daily 필수 숫자 4개 (mood/energy/stress/sleep_hours) 외 필드 추가 자제.
- **관계는 본문 inline field** — `person:: [[홍길동]]`, `project:: [[dots-vs]]`. YAML list 의 wikilink 금지.

## 태그 규칙

- 기본 태그: `journal/daily` (일일), `journal/weekly`, `journal/monthly`, `journal/yearly`.
- 감정 태그는 frontmatter `emotion_tags: [기쁨, 불안, ...]` 문자열 리스트로.
- 볼트 식별 태그는 불필요 (인덱서 `vault` 필드 사용).

## 사용법 참조

- 복제 실행: `C:/AIMindVaults/Vaults/BasicVaults/MakeCloneVault.bat`
- 스펙 노트: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260420_Diary_Hub_명세.md`
- Multi-Hub 아키텍처: `20260419_Multi_Hub_아키텍처_설계.md`
- Hub 공유 가이드: `docs/hub-sharing.md`
