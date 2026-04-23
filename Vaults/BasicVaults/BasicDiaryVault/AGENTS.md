# BasicDiaryVault — Diary Preset 클론 템플릿 (Codex)

> Codex 전용 진입점. Claude Code → `CLAUDE.md` 참조.
> 공통 강제 규칙: 루트 `.claude/rules/`에서 자동 적용.

## 공통 규칙 (정본 참조 — Mandatory)

루트 `.claude/rules/` 디렉토리의 **모든 규칙 파일**을 읽고 따른다.
볼트 `CLAUDE.md`도 참조한다.

## 주의: 이 볼트는 직접 편집 금지

이 볼트는 Diary Preset Hub (`AIHubVault_Diary`) 용 **위성 클론 소스 템플릿**이다.
- 직접 콘텐츠 작업 금지
- 사용자가 `MakeCloneVault.bat` 실행 시 복제 소스로만 사용
- Hub 가 아님 (`hub-marker.json` · `hub-source.json` 생성 금지)
- workspace 는 AIHubVault_Diary 에서 sync 로 동기화

## 볼트명이 BasicDiaryVault가 아닌 경우

복제 후 초기 설정이 안 된 상태이다. 즉시:
1. 이 AGENTS.md 의 제목/역할을 실제 용도에 맞게 수정
2. `CLAUDE.md`, `_STATUS.md` 도 동일하게 수정
3. 루트 `_STATUS.md` 볼트 레지스트리에 등록

## 일기 볼트 원칙 (프라이버시 우선)

- AI scope 기본 `none` — daily 원문 AI 전송 금지
- 주간 요약만 `ai_scope: summary`
- AI 단독 생성 노트는 `Contents/_AI_Drafts/` 격리
- git 없음 · OS 암호화 볼륨 기반 백업

## 에이전트 식별자

- **식별자**: `codex`

## Codex 고유 규칙

| 파일 | 용도 |
|------|------|
| `.codex/rules/never-do.md` | 금지 목록 |
| `.codex/rules/note-writing.md` | 노트 작성 규칙 |
| `.codex/rules/bulk-edit-safety.md` | 대량 편집 안전 |
