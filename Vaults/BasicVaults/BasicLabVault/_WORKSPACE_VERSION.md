---
type: workspace-version
tags:
  - BasicLabVault
  - Lab
  - Meta
updated: 2026-04-22
---

# Workspace Version

> 동기화 판정용 버전 번호. 형식: `YYYYMMDDNNNN` (날짜 + 당일 순번).
> Lab Preset 클론 템플릿 초기화 버전.

| 버전           | 변경 내용 |
| ------------ | ----- |
| 202604220001 | BasicLabVault 초기화 — BasicContentsVault 기반 미러 후 Contents/ 를 Lab 9 타입 구조 (00_Idea ~ 08_Decision + _AI_Drafts + _archive + _log + _index) 로 재구성. `_Templates/` 에 Templater 9 종 (idea, literature, permanent, moc, experiment, failure-log, plan, report, decision) 배치. 루트 `Dashboard.md` 추가 (Lab Dataview 쿼리 9 종). CLAUDE.md · _STATUS.md · README.md · _VAULT-INDEX.md 를 Lab Preset 클론 템플릿 역할로 재작성. hub-marker.json · hub-source.json 생성 안 함 (위성은 rebase 로 Hub 바인딩). Custom 플러그인 추가 설치 없음 |
