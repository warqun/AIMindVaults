---
type: status
tags:
  - BasicDiaryVault
  - Template
  - Diary
updated: 2026-04-22
---

# STATUS — BasicDiaryVault

> **Diary Preset 클론 템플릿 — 직접 작업 대상 아님.**

## Now
- Template vault · 작업 대상 아님
- Diary Preset Hub (`AIHubVault_Diary`) 위성 생성 시 복제 소스로 사용됨

## Next
- (해당 없음 · 위성 클론 소스)

## Blocked
- 없음

## Decisions
- (2026-04-22) 초기 생성. BasicContentsVault 미러 복사 후 Diary 용도로 재구성.
- (2026-04-22) Contents/ 하위 폴더는 `Daily/`, `Weekly/`, `Monthly/`, `Yearly/`, `Reviews/AI Summaries/`, `_AI_Drafts/`, `_archive/` 로 선배치. `Diary/` wrapper 없이 flat 구조 (Dashboard Dataview `FROM "Contents/Daily"` 기준).
- (2026-04-22) `_Templates/` 볼트 루트 배치. Templater 템플릿 5종 (Morning/Evening/Weekly/Monthly/Yearly).
- (2026-04-22) `.obsidian/plugins/` 는 BasicContentsVault 에서 그대로 복사. 클론 후 `AIHubVault_Diary` 에 rebase 하면 Custom A 플러그인이 prune 되고 Custom 4 가 주입됨.
- (2026-04-22) QuickAdd 매크로 설정 없음 (per-device). 사용자가 클론 후 수동 구성.
- (2026-04-22) Hub 마커 (`hub-marker.json`, `hub-source.json`) 생성 안 함. 이 볼트는 Hub 가 아닌 템플릿.

## 이 볼트의 역할

### 볼트명이 BasicDiaryVault인 경우
> **Diary 위성 복제 소스 템플릿** — 직접 콘텐츠 작업 대상 아님

### 볼트명이 BasicDiaryVault가 아닌 경우
> 복제 후 초기 설정 미완료. CLAUDE.md 와 이 파일의 역할을 실제 용도에 맞게 수정하고, 루트 `_STATUS.md` 에 등록할 것.
