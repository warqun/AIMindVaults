---
type: workflow
tags:
  - AIMindVault
  - Meta
  - antigravity
updated: 2026-03-19
agent: antigravity
---

# Antigravity 세션 규칙 (DEPRECATED)

> **DEPRECATED (2026-03-21)**: Antigravity → Codex 데스크탑 앱으로 전환. 볼트 루트의 `AGENTS.md`를 사용.

> Antigravity 전용 세션 진입점.

## 공통 규칙 (정본 참조 — Mandatory)

루트 `.claude/rules/` 디렉토리의 **모든 규칙 파일**을 읽고 따른다.
이 규칙들은 모든 AI 에이전트에 동일 적용되는 강제 규칙이다.

## 이 볼트의 역할

**AI 작업환경 설계·개선·배포 허브** — `_Standards`, `_tools`, `.claude` 등 AI 운영 구조 관리.

## 세션 시작 루틴 (강제)

1. 루트 `.claude/rules/` 전체 읽기 — 공통 강제 규칙
2. 루트 `_STATUS.md` 확인 — 전체 볼트 현황
3. `_STATUS.md` 확인 — 이 볼트의 현재 상태
4. `.antigravity/AGENT_STATUS.md` 확인 — 내 마지막 작업 상태
5. `_VAULT-INDEX.md`로 작업환경 구조 파악

## Antigravity 고유 사항

- **에이전트 식별자**: `antigravity`
- 백그라운드 에이전트 — 토큰 절약 최우선
- 워크플로우 실행: 루트 `.antigravity/workflows/` 참조
- 세션 종료 시 볼트 `_STATUS.md` + 루트 `_STATUS.md` 작업 에이전트를 `antigravity / YYYY-MM-DD`로 기록

## 다른 에이전트와의 관계

| 에이전트 | 진입점 | 공통 규칙 |
|----------|--------|----------|
| Antigravity (나) | `.antigravity/SESSION_RULES.md` | `.claude/rules/` 참조 |
| Claude Code | `CLAUDE.md` | `.claude/rules/` (정본) |
| Codex | `.codex/CODEX.md` | `.claude/rules/` 참조 |
| Cursor | `.cursor/rules/` | `.claude/rules/` 참조 |
