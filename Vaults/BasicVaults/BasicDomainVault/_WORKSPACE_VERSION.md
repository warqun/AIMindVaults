---
type: workspace-version
tags: [BasicDomainVault, Template, Multi-Hub, Domain, Zettelkasten]
updated: 2026-04-22
---

# Workspace Version

> 동기화 판정용 버전 번호. 형식: `YYYYMMDDNNNN` (날짜 + 당일 순번).
> 이 파일의 최상단 버전과 Domain Preset Hub (AIHubVault_Domain) 의 최상단 버전을 비교하여 동기화 여부를 판정.

| 버전 | 변경 내용 |
| ---- | --------- |
| 202604220001 | BasicDomainVault 초기 생성 — BasicContentsVault 에서 구조 복제 후 Domain Preset (ZK) 으로 개별화. `Contents/` 를 ZK 타입별 폴더 (00_Fleeting ~ 05_Pattern + _AI_Drafts + _archive + _log.md + _index.md) 로 재구성. `_Templates/` 에 Templater 템플릿 5종 (fleeting/literature/permanent/moc/synthesis) 배치. `Dashboard.md` 에 Dataview 쿼리 6개 (fleeting 적체, 고아, thin, 재활성화, 링크 밀도, AI Drafts). CLAUDE.md/_STATUS.md/README.md/_VAULT-INDEX.md 를 Domain Preset 클론 템플릿 역할로 재작성. hub-marker/hub-source 금지 규칙 반영 |
