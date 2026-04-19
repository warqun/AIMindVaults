---
tags:
  - TileMapToolKit
type: plugin-standard
plugin: obsidian-shellcommands
updated: 2026-03-05
---

# Shell Commands

## 기능

- Obsidian 이벤트/명령과 로컬 스크립트 연결
- ~~시작 루틴 자동화(`_tools/open_agents.ps1`)~~ → **사용 중지** (멀티볼트 루트에서 IDE 1회 실행으로 충분)

## 주 사용 작업

- ~~볼트 시작 시 개발 도구 자동 실행~~ → 폐지
- 반복 검증 스크립트 단축 실행

> [!NOTE]
> `on-layout-ready` 이벤트에서 `open_agents.ps1` 연결을 해제해야 합니다.
> Obsidian → 설정 → Shell Commands → Events에서 해당 이벤트 제거.

## 기본 절차

1. 명령을 `_tools/` 스크립트로 분리
2. 플러그인에서 명령 등록
3. 이벤트(on-layout-ready 등)에 연결

## 주의

- 쓰기/삭제 명령은 별도 확인 단계를 둔다.

