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
| 배포·Git push, sync 기능 수정 | 배포, SellingVault, git push, 동기화 배포, 영문 배포, distribute, deploy, cli.js sync, pre-sync, _WORKSPACE_VERSION, sync-version, pre-sync 트램펄린 | `/distribute` Skill |
| Multi-Hub | Core Hub, Preset Hub, CoreHub, core-sync, core-sync-all, hub-source.json, hub-marker.json, multi-hub, 코어 허브, bump-version --broadcast, hubId, hubType, hub-resolver | `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md` + `20260420_Multi_Hub_Phase1_구현_결과.md` Read |
| 새 볼트 생성 (위성) | 볼트 생성, create-vault, 새 볼트, 볼트 분리 | `/create-vault` Skill (R160 core 격상) — `vault-individualization.md` 는 core 상시 주입 (R160) 이므로 명시 Read 불필요 |
| 새 Preset Hub 생성 | Preset Hub 생성, 프리셋 허브 만들기, create-preset-hub, create-hub, 신규 Hub, AIHubVault_ 생성, Hub 파생 | `/create-preset-hub` Skill |
| 대량 편집 · 인코딩 | 대량 수정, 일괄 변경, 인코딩, mojibake, 한글 깨짐, bulk rewrite | `.claude/rules/core/encoding-safety.md` + `.claude/rules/core/temp-file-management.md` (core 주입됨) |
| 스크립트 생성 | 스크립트 생성, .ps1, .py 신규, 자동화 스크립트 | `.claude/rules/core/script-creation-approval.md` + `.claude/rules/core/script-management.md` (core 주입됨) |
| Juggl 편집 | Juggl, graph.css, Juggl 임베드 | `.claude/rules/core/juggl-style-sync.md` (core 주입됨) |
| .obsidian/ 편집 | .obsidian, 플러그인 설정, community-plugins.json | `.claude/rules/core/obsidian-config-safety.md` (core 주입됨) |
| 유저 가이드 저위험 (§1, §3, §6, §7, §9, §12) | Obsidian 열기, 노트 어디에, 어느 볼트, 플러그인 설치, 세션 종료, 끝났어, 정리해, 마무리, 노트 어디 있어, 배포 어떻게, SellingVault, 어떻게, 뭘 해야, 모르겠, 까먹, 방법, 절차, 다음에 뭐, how to, what should I | `.claude/rules-archive/user-guidance-detail.md` Read |
| 에이전트 협업 | Codex와 동시, 충돌, 에이전트 분담 | `.claude/rules/custom/agent-ownership.md` (custom 주입됨) |
| 임시 파일 · 재귀 삭제 | 임시 파일, MAX_PATH, 무한 재귀, flatten-and-delete, robocopy | `.claude/rules/core/temp-file-management.md` (core 주입됨) |
| Obsidian 인스턴스 제어 | Obsidian 창, 옵시디언 창, ob 창, 인스턴스, instance, N개로 맞춰, N개로 줄여, N개로 늘려, Obsidian 정리, 옵시디언 닫아, Obsidian 몇 개 | `/obsidian-windows` Skill + `.claude/rules/custom/obsidian-instance-control.md` (custom 주입됨) |
| 에이전트 작업 위임 | 위임, 떠넘겨, 백그라운드로, 별도 인스턴스로, 워커, delegate, 병렬 작업, 동시 작업, 다른 클로드, 다른 에이전트가, 큐로 던져, 긴 작업이라 따로, 이건 다른 세션에서 | `/delegate-task` Skill (큐 작성 + spawn + 트리거 + 추적 + 완료 통합 워크플로우) |
| Canvas 작성 (Obsidian Advanced Canvas) | 캔버스, 구조도, 다이어그램, advanced canvas, Obsidian Canvas, .canvas, 노드 + 엣지, 시스템 도식 | `/canvas-create` Skill + `.agents/rules/custom/Canvas/canvas-design.md` Read |
| viz · 디바이스 간 동기화 | viz, 시각화, 동기화, sync-banner, sync-status, viz `.exe`, Generate Visualization, viz_snapshots, Viz-Snapshot, 디바이스 정합, KPI 불일치, 캘린더 헤더, master_index 차이, vault_index, 자동 동기화, AIMV_VIZ_AUTO | `.claude/rules/core/viz-device-sync.md` (core 주입됨) |

## 매칭 실패 시

- 키워드 없음 → `_essentials.md`만으로 작업.
- 필요한 규칙이 있을 것 같은데 테이블에 없음 → 사용자에게 "이 작업에 적용할 규칙이 있는지" 확인 후 진행.
- 새로운 작업 유형이 자주 발생 → 사용자 승인 후 이 테이블에 추가.

## Phase 2-A 완료 (2026-04-18)

도메인 규칙들을 Skill 로 전환 완료. 일반 인프라 Skill 매핑:

| Skill | 통합된 archive 규칙 |
|-------|-------------------|
| `/distribute` | distribution-deploy + sync-version-priority |

도메인별 Skill 매핑은 사용자 환경에 따라 다르므로 본 라우터에 기본 등록하지 않는다. 사용자가 본인 환경 (Unity, Blender, 외부 API, 메시징 봇 등) 의 도메인 Skill 을 추가할 때 위 트리거 매핑 테이블에 직접 등록.

custom/에 유지된 규칙 (상시 주입): `agent-ownership.md`, `multivault-personalization.md`
