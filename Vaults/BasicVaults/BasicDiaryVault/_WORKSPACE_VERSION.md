---
type: workspace-version
tags:
  - BasicDiaryVault
  - Meta
updated: 2026-04-22
---

# Workspace Version

> 동기화 판정용 버전 번호. 형식: `YYYYMMDDNNNN` (날짜 + 당일 순번).
> Template vault — 버전 관리는 최소. 첫 위성 rebase 시 `AIHubVault_Diary` 최상단 버전으로 교체됨.

| 버전           | 변경 내용 |
| ------------ | ----- |
| 202604220001 | BasicDiaryVault 초기 생성. BasicContentsVault 미러 복사 후 Diary 용 Contents 구조 재구성, `_Templates/` 5종, `Dashboard.md`, 루트 가이드 파일 4종 (CLAUDE/STATUS/README/VAULT-INDEX) 재작성. Hub 마커는 생성하지 않음 (템플릿). |
