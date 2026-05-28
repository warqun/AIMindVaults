# Skill Router (Codex 전용 · Mandatory)

> Codex 는 Claude 의 Skill 도구·slash command 체계가 없으므로, 트리거 키워드 감지 시 **해당 규칙 파일을 직접 Read** 해서 적용한다.
> Claude 의 `.claude/rules/core/_skill-router.md` 와 대응되는 Codex 전용 라우터.
> 세션 진입 시 자동 주입되지 않으므로 `AGENTS.md § 세션 시작 순서` 따라 명시적 Read.

## 운영 규칙

1. 매 사용자 메시지 수신 시 + 작업 도중 새 트리거 감지 시마다 이 테이블 검토.
2. 매칭 발견 → 해당 파일 Read 후 적용.
3. 이미 세션 내에서 Read 한 파일은 재Read 금지 (토큰 절약).
4. 매칭 없으면 `.claude/rules/core/` + `.claude/rules/custom/` 만으로 진행.
5. 복수 매칭 시 순차 Read (의존성 없음).

## 트리거 매핑 테이블

| 작업 유형 | 트리거 키워드 | Read 대상 |
|---------|-------------|----------|
| Unity 스크립팅 | Unity, C#, 유니티, 스크립트, 스킬 시스템, mcp-unity, unity-cli, Serena, find_symbol, replace_symbol_body, 심볼 기반 편집 | `.agents/rules/custom/Unity/unity-tools.md` + `unity-scripting-style.md` + `serena-mcp.md` |
| Blender 작업 | Blender, 블렌더, 3D 모델링, bpy, Hyper3D, Polyhaven, Sketchfab | `.agents/rules/custom/Blender/blender-mcp.md` |
| Meshy API | Meshy, AI 텍스처, 3D 생성, Meshy 크레딧, text-to-3d, image-to-3d | `.agents/rules/custom/Meshy/meshy-api.md` |
| Discord 운영 | Discord, 디스코드, 디코, 봇, AIMindVaults Admin Bot, 채널, Forum, Community, allowed_mentions | `.agents/rules/custom/Discord/discord-bot.md` |
| Notion 기록 | Notion, 노션, 작업 관리 DB, 개발 현황 공유, Notion 기록 | `.agents/rules/custom/Notion/notion-sync.md` |
| 배포·Git push, sync 기능 수정 | 배포, SellingVault, git push, 동기화 배포, 영문 배포, distribute, deploy, cli.js sync, pre-sync, _WORKSPACE_VERSION, sync-version | `.agents/rules/custom/Distribution/distribution-deploy.md` + `sync-version-priority.md` |
| Multi-Hub | Core Hub, Preset Hub, CoreHub, core-sync, core-sync-all, hub-source.json, hub-marker.json, multi-hub, 코어 허브, bump-version --broadcast, hubId, hubType, hub-resolver | `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md` + `20260420_Multi_Hub_Phase1_구현_결과.md` |
| 새 볼트 생성 | 볼트 생성, create-vault, 새 볼트, 볼트 분리, 신규 볼트 | `.codex/skills/create-aimind-vault/SKILL.md` + `.codex/rules/create-vault-safety.md` + `.agents/rules/custom/CreateVault/vault-individualization.md` |
| 노트 작성 세부 | 노트 타입 목록, 태그 규칙, H1 예시, frontmatter 세부 | `.claude/rules-archive/note-writing.md` |
| 볼트 라우팅 세부 | 라우팅 상세, 키워드 매핑 원본 | `.claude/rules-archive/vault-routing.md` |
| Post-Edit Review 세부 | review 명령 세부, BAD/INDEX 기준 | `.claude/rules-archive/post-edit-review.md` |
| 편집 모드 세부 | AIHubVault 전용 워크플로, Contents vs workspace 세부 | `.claude/rules-archive/edit-mode-separation.md` |
| 세션 종료 세부 | 핸드오프 템플릿, 종료 절차 | `.claude/rules-archive/session-exit.md` |
| 토큰 절약 세부 | fallback 조건, 인덱서 심화 | `.claude/rules-archive/token-optimization.md` |
| 유저 가이드 저위험 | Obsidian 열기, 노트 어디에, 어느 볼트, 플러그인 설치, 세션 종료, 끝났어, 정리해, 마무리, 노트 어디 있어, 배포 어떻게, 어떻게, 뭘 해야, 모르겠, 까먹, 방법, 절차, 다음에 뭐 | `.claude/rules-archive/user-guidance-detail.md` |

## Serena MCP 조건부 호출

- Serena는 전역 `~/.codex/config.toml`의 `[mcp_servers.serena]`에 등록하지 않는다.
- Unity/C# 스크립팅 트리거가 매칭된 경우에만 `tool_search`로 `serena`를 검색해 도구를 노출한다.
- Serena 도구가 노출되면 대상 Unity 프로젝트를 먼저 `activate_project`로 활성화한다.
- 노트 작성, 볼트 운영, 루트 설정, 비-C# 파일 작업에서는 Serena를 호출하지 않는다.

## 매칭 실패 시

- 키워드 없음 → `.claude/rules/core/_essentials.md` + `.codex/rules/` 기본 규칙만으로 작업.
- 필요한 규칙이 있을 것 같은데 테이블에 없음 → 사용자에게 "이 작업에 적용할 규칙이 있는지" 확인 후 진행.
- 새로운 작업 유형이 자주 발생 → 사용자 승인 후 이 테이블에 추가 (`_AGENT_COMMS/to_codex/` 로 Claude 에게 요청하거나 직접 편집).

## Claude 라우터와의 차이

| 항목 | Claude `_skill-router.md` | Codex `skill-router.md` |
|------|-------------------------|------------------------|
| 호출 방식 | `Skill` 도구로 `/skill-name` 실행 | 해당 archive 파일 직접 Read |
| Skill 래퍼 | `.claude/commands/core/*.md`, `custom/*.md` 절차서 | 없음 — Codex 는 archive 원문 직접 해석 |
| 자동 주입 | core/ · custom/ 전체 자동 주입 | 없음 — 세션 시작 순서에 따라 명시적 Read |

## 참조

- Claude 라우터 원본: `.claude/rules/core/_skill-router.md`
- Essentials 통합 코어: `.claude/rules/core/_essentials.md` (Codex 도 세션 시작 시 반드시 Read)
- Archive 전체 목록: `.claude/rules/MANIFEST.md § rules-archive/`
