---
type: standard
tags:
  - TileMapToolKit
  - AIMindVault
  - core
updated: 2026-03-11
---

# VaultTypes — 볼트 타입 비교 인덱스

이 볼트 시스템은 두 가지 원형(prototype)을 제공한다.
사용자가 수동으로 볼트를 세팅한다.

## 타입 비교

| 항목 | domain | project |
|------|--------|---------|
| **목적** | 분야별 지식 축적 (PKM) | 목표 달성 (작업 관리) |
| **스펙 문서** | [[VAULTTYPE_DOMAIN]] | [[VAULTTYPE_PROJECT]] |
| **콘텐츠 루트** | `Contents/Domain/` | `Contents/Project/` |
| **하위 구조** | 볼트별 자유 설계 (CONTENTS_SPEC에 정의) | 볼트별 자유 설계 (CONTENTS_SPEC에 정의) |
| **Juggl 운용** | 주제 클러스터 + 시간축 | 계층 + 의존 그래프 |
| **AI 에이전트** | 공유 멀티볼트 환경 (최상단에서 공통 관리) | 공유 멀티볼트 환경 (최상단에서 공통 관리) |
| **노트 템플릿** | 볼트별 자유 구성 (도메인 예시 제공) | 볼트별 자유 구성 (프로젝트 예시 제공) |

## 공통 사항

- `_Standards/Core/` — 최상단 글로벌에서 동기화 (모든 볼트 동일)
- `_Standards/Contents/` — 볼트별 커스텀 규칙 (복사 안 함, 개별 생성)
- `CONTENTS_SPEC.md` — 볼트 정체성·콘텐츠 범위·하위 구조 정의
- `.obsidian/plugins/` — obsidian-git 제외 전체 공유
- AI 에이전트 — 최상단 `CLAUDE.md` / `CODEX.md` / `ANTIGRAVITY.md`에서 라우팅, 볼트별 로컬 진입점으로 오버라이드

## 관련 문서

- [[VAULTTYPE_DOMAIN]] — 도메인 볼트 전체 스펙
- [[VAULTTYPE_PROJECT]] — 프로젝트 볼트 전체 스펙
- [[NoteTemplates/TEMPLATE_INDEX]] — 전체 템플릿 목록

