# Skill Router (Mandatory · Always Loaded)

> 에이전트는 **매 사용자 메시지 수신 시** 이 테이블을 검토하여 트리거 키워드에 해당하는 Skill을 호출하거나 규칙 파일을 수동 Read한 후 작업을 시작한다.
> 매칭 없으면 `_essentials.md`만으로 진행. 복수 매칭 시 순차 처리.
> 이미 세션 내에서 호출/Read한 규칙은 재실행 금지 (토큰 절약).

## 운영 규칙

1. 사용자 첫 메시지 + 작업 도중 새 트리거 감지 시마다 검토.
2. 매핑 값은 **Skill 호출** 또는 **Read할 규칙 파일 경로**. Skill이 있으면 Skill 우선.
3. Skill 호출은 `Skill` 도구로 `<name>` 실행. 파일 Read가 필요하면 해당 Skill 본문 지시에 따라 archive 규칙을 Read.
4. 로드된 규칙을 적용하며 작업.

## 트리거 매핑 테이블

| 작업 유형 | 트리거 키워드 | 호출 대상 |
|---------|-------------|---------------|
| Unity 스크립팅 | Unity, C#, 유니티, 스크립트, 스킬 시스템, mcp-unity, unity-cli, Serena, find_symbol, replace_symbol_body, 심볼 기반 편집 | `/unity-dev` Skill |
| Blender 작업 | Blender, 블렌더, 3D 모델링, bpy, Hyper3D, Polyhaven, Sketchfab | `/blender-workflow` Skill |
| Meshy API | Meshy, AI 텍스처, 3D 생성, Meshy 크레딧, text-to-3d, image-to-3d | `/meshy-workflow` Skill |
| Discord 운영 | Discord, 디스코드, 디코, 봇, AIMindVaults Admin Bot, 채널, Forum, Community, allowed_mentions | `/discord-admin` Skill (실제 조작 시 `/discord-manage` 추가) |
| Notion 기록 | Notion, 노션, 작업 관리 DB, 개발 현황 공유, Notion 기록 | `/notion-record` Skill |
| 배포·Git push, sync 기능 수정 | 배포, SellingVault, git push, 동기화 배포, 영문 배포, distribute, deploy, cli.js sync, pre-sync, _WORKSPACE_VERSION, sync-version, pre-sync 트램펄린 | `/distribute` Skill |
| Multi-Hub | Core Hub, Preset Hub, CoreHub, core-sync, core-sync-all, hub-source.json, hub-marker.json, create-hub, multi-hub, 프리셋 허브, 코어 허브, bump-version --broadcast, hubId, hubType, hub-resolver | `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md` + `20260420_Multi_Hub_Phase1_구현_결과.md` Read |
| 새 볼트 생성 | 볼트 생성, create-vault, 새 볼트, 볼트 분리 | `/create-vault` Skill + `.claude/rules-archive/vault-individualization.md` Read |
| 대량 편집 · 인코딩 | 대량 수정, 일괄 변경, 인코딩, mojibake, 한글 깨짐, bulk rewrite | `.claude/rules/core/encoding-safety.md` + `.claude/rules/core/temp-file-management.md` (core 주입됨) |
| 스크립트 생성 | 스크립트 생성, .ps1, .py 신규, 자동화 스크립트 | `.claude/rules/core/script-creation-approval.md` + `.claude/rules/core/script-management.md` (core 주입됨) |
| Juggl 편집 | Juggl, graph.css, Juggl 임베드 | `.claude/rules/core/juggl-style-sync.md` (core 주입됨) |
| .obsidian/ 편집 | .obsidian, 플러그인 설정, community-plugins.json | `.claude/rules/core/obsidian-config-safety.md` (core 주입됨) |
| 유저 가이드 저위험 (§1, §3, §6, §7, §9, §12) | Obsidian 열기, 노트 어디에, 어느 볼트, 플러그인 설치, 세션 종료, 끝났어, 정리해, 마무리, 노트 어디 있어, 배포 어떻게, SellingVault, 어떻게, 뭘 해야, 모르겠, 까먹, 방법, 절차, 다음에 뭐, how to, what should I | `.claude/rules-archive/user-guidance-detail.md` Read |
| 에이전트 협업 | Codex와 동시, 충돌, 에이전트 분담 | `.claude/rules/custom/agent-ownership.md` (custom 주입됨) |
| 임시 파일 · 재귀 삭제 | 임시 파일, MAX_PATH, 무한 재귀, flatten-and-delete, robocopy | `.claude/rules/core/temp-file-management.md` (core 주입됨) |

## 매칭 실패 시

- 키워드 없음 → `_essentials.md`만으로 작업.
- 필요한 규칙이 있을 것 같은데 테이블에 없음 → 사용자에게 "이 작업에 적용할 규칙이 있는지" 확인 후 진행.
- 새로운 작업 유형이 자주 발생 → 사용자 승인 후 이 테이블에 추가.

## Phase 2-A 완료 (2026-04-18)

도메인 규칙 6개 Skill 전환 완료. custom/ 규칙 7개 → rules-archive/ 이관.

| Skill | 통합된 archive 규칙 |
|-------|-------------------|
| `/distribute` | distribution-deploy + sync-version-priority |
| `/unity-dev` | unity-tools + unity-scripting-style + serena-mcp |
| `/blender-workflow` | blender-mcp |
| `/meshy-workflow` | meshy-api |
| `/discord-admin` | discord-bot |
| `/notion-record` | notion-sync |

custom/에 유지된 규칙 (상시 주입): `agent-ownership.md`, `multivault-personalization.md`
보류 대상: `bulk-edit-safe` Skill (core 안전 규칙이라 별도 검토 필요)
