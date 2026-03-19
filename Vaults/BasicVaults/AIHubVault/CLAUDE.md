---
aliases:
  - "Claude 컨텍스트(루트)"
  - "Claude 컨텍스트"
  - "프로젝트 메모리"
tags:
  - AIMindVault
  - Meta
type: workflow
updated: 2026-03-10
agent: claude
---

# AIHubVault — AI 작업환경 설계·개선·배포 허브

> **이 파일은 Claude Code 전용 진입점이다.**
> Antigravity → `.antigravity/SESSION_RULES.md` 참조.
> Codex → `CODEX.md` 참조.
> Cursor → `.cursor/rules/` (루트 자동 로드) 참조.
> **공통 강제 규칙**: 루트 `AIMindVaults/.claude/rules/`에서 자동 적용됨.

> AI 활용 워크플로우, 도구 설정, 에이전트 협업 패턴을 관리하는 Obsidian 볼트.

## 이 디렉토리의 역할

**AI 작업환경 설계·개선·배포 허브** — `_Standards`, `_tools`, `.claude`, `_forge` 등 AI 운영 구조 관리.

## 디렉토리 구조

```
AIMindVault/
├── Contents/            # 볼트 콘텐츠
│   ├── Domain/          # 지식 축적 (PKM)
│   │   ├── guides/      # AI 기능 활용 가이드
│   │   ├── research/    # 조사 정보 정리
│   │   ├── prompt/      # AI 프롬프트 작성 방식 설명
│   │   └── HowAgentWorks/ # 에이전트 동작 방식 문서
│   └── Project/         # 목표 달성·작업 관리
│       ├── idea/        # 아이디어 모음 (human/ + ai/)
│       └── plan/        # AI 활용 계획 (계획별 하위 폴더)
├── _Standards/          # Vault 일관성 기준
│   ├── Core/            # 공통 운영 표준 (모든 볼트에 배포)
│   └── Domain/          # AIMindVault 전용 커스텀 규칙
├── _tools/              # 자동화 스크립트
├── _forge/              # 작업환경 배포 허브
├── Juggl_StyleGuide/    # Juggl 매핑 가이드 (범용 템플릿)
├── Tags/                # 태그 노트
├── _VaultReview/        # 에이전트 검토 보고서
└── CLAUDE.md
```

## 세션 진입 규칙 (강제)

- 새 세션에서 작업지시를 받으면, 어떤 작업이든 시작 전에 _STATUS.md를 먼저 읽는다.

## 세션 시작 루틴

1. `_STATUS.md` 확인 (현재 집중/다음/블로킹)
2. `_VAULT-INDEX.md`로 문서 위치 파악
3. 필요 시 `.codex/AGENT_STATUS.md` 확인 (Codex 마지막 작업 — 충돌 방지)

## 이 보관함 사용 규칙

- 문서는 한국어로 작성
- **노트 생성 시**: `_Standards/Core/NoteProperties.md`의 Frontmatter 규칙 준수 필수
  - 모든 노트는 YAML Frontmatter(`---`)로 시작
  - `type`, `tags`(AIMindVault 포함), `updated` 또는 `created` 필수
  - 새 폴더 생성 시 `_VAULT-INDEX.md` 루트 구조에 등록

## 공통 규칙 참조

아래 규칙은 루트 `AIMindVaults/.claude/rules/`에 정의되어 자동 적용:
- 편집 모드 분리, 인코딩 안전, Post-Edit Review, 스크립트 관리, Juggl 동기화, 노트 작성 패턴
- 상세: `_WORKFLOW.md` § 6) 편집 모드 분리
- 기준 문서: `_Standards/Core/` 하위 각 문서
