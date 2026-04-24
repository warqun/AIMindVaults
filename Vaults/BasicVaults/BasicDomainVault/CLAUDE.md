---
type: workflow
tags: [BasicDomainVault, Template, Multi-Hub, Domain, Zettelkasten]
updated: 2026-04-22
agent: claude
---

# BasicDomainVault — Domain Preset 클론 템플릿

> **이 볼트는 `MakeCloneVault` 가 Domain Preset Hub (AIHubVault_Domain) 위성을 만들 때 사용하는 복제 소스 템플릿이다.**
> 직접 콘텐츠 작업 금지. Domain Preset 명세: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260421_Domain_Hub_명세.md`.

## 볼트명이 BasicDomainVault 인 경우

이 볼트는 Domain Preset 의 clone source 다.

- 직접 콘텐츠 작업 금지
- Hub 가 아니다 (`hub-marker.json` · `hub-source.json` 생성 금지)
- workspace 동기화 제외 대상
- 관련: `MakeCloneVault.bat` · `/create-vault` 스킬 · `AIHubVault_Domain/.sync/hub-marker.json.defaultTemplate`

## 볼트명이 BasicDomainVault 가 아닌 경우

이 볼트는 복제 후 아직 초기 설정이 안 된 상태이다. **즉시 아래를 수행한다:**

1. 이 CLAUDE.md 의 제목·역할·태그를 실제 도메인에 맞게 수정 (예: Unity, Python, AI)
2. `_STATUS.md` 의 역할도 동일하게 수정
3. 루트 `_STATUS.md` 볼트 레지스트리에 이 볼트를 등록 (미등록 시)
4. `_VAULT-INDEX.md` 를 ZK 구조 기준으로 볼트 맞춤 조정
5. 기존 도메인 자료가 있으면 `Contents/_archive/legacy-YYYY-MM/` 로 이관 후 점진 변환

## Zettelkasten 규약 (Domain Preset 핵심)

### 원자성 · 링크 · 승격

- **한 판단 가능한 주장 = 한 permanent** 노트. 2 개 이상이면 분리
- 구조는 폴더가 아니라 `[[wikilink]]` + MOC 로 구축. 폴더는 타입 분류만
- 승격 흐름: `fleeting` (24h 내) → `literature` 또는 `permanent` → `synthesis` (여러 permanent 연결)

### AI 보조 원칙

- AI 는 related 추천, 중복 탐지, MOC 초안, literature 요약, frontmatter 검증, synthesis 후보 제안만 허용
- **AI 가 단독 생성한 노트는 전부 `Contents/_AI_Drafts/` 로 격리**한다. 본인이 재구성·승인한 후에만 `02_Permanent/` 또는 `01_Literature/` 로 수동 이동
- 이동 시 `status: draft` → `active` 로 전환
- **AI 가 permanent 의 핵심 주장 자체를 결정하지 않는다.** 주장은 사람이 내린다

### 태그 규칙 (도메인 볼트 공통)

- 도메인 식별은 인덱서 `vault` 필드가 담당 — `domain` frontmatter 필드 사용 금지
- `tags` 는 **상태·운영용만** (`zk`, `literature`, `synthesis`, `moc`, `pattern`)
- **개념 분류 태그 금지** — 개념은 링크로 연결하라
- 고유명사는 원표기 유지 (`Unity`, `Python`, `AI`)

### Frontmatter 표준

- 공통 7 필드: `id` (permanent/literature/synthesis 한정), `type`, `status`, `created`, `updated`, `tags: [zk]`, `agent`
- literature 3 추가 필드: `source_type`, `author`, `year`
- **wikilink 관계 필드 (`see_also`, `source`, `related`) 는 frontmatter 에 넣지 말 것.** 본문 Dataview inline field 로 (`- source:: [[...]]`)

### 파일명 · H1

- kebab-case. URI 예약문자 (`#`, `%`, `&`, `?`, `+`) 금지, 이모지 금지
- 가독성은 `aliases` frontmatter 로

### 수집 범위 · 수집하지 않는 것

- 수집 범위: 이 볼트의 도메인 지식 · 외부 자료 요약 · 도메인 내 통찰과 패턴
- 수집하지 않는 것: 프로젝트 작업 (Project 볼트로), 일기 · 회고 (Diary 볼트로), Lab 실험 (Lab 볼트로)
