<!-- 수동 관리 문서 — agents-sync 는 last_updated timestamp 만 자동 갱신. 영역별 버전 표·카테고리 분류·파일 수 컬럼은 수동 편집 (영역 변경 시 직접 갱신). -->

---
type: standard
manifest_version: 1.0
generated_by: agents-sync
last_updated: 2026-05-28
---

# .agents/_MANIFEST.md — 카테고리 분류 + 영역별 버전 정본

> 양 에이전트 (Claude, Codex) 가 본 manifest 를 참조해 자기 위치 룰·스킬을 적용.
> `core` 영역은 매 세션 자동 주입. `custom/{도메인}` 영역은 트리거 키워드 매칭 시 lazy load.
> 각 영역 독립 버전 — 변경 시 해당 영역만 bump.

## 영역별 버전

| 영역 | 버전 | 마지막 변경 | 변경자 | 자동 주입 | 파일 수 |
|------|------|-----------|--------|---------|--------|
| core (rules+commands+hooks) | 1.0.0 | 2026-05-18 | claude | ★ 자동 | rules 12 + commands 20 + hooks 0 |
| custom/Unity | 1.0.0 | 2026-05-18 | claude | 트리거 매칭 시 | rules 3 + commands 1 |
| custom/Blender | 1.0.0 | 2026-05-18 | claude | 트리거 매칭 시 | rules 1 + commands 1 |
| custom/Meshy | 1.0.0 | 2026-05-18 | claude | 트리거 매칭 시 | rules 1 + commands 4 |
| custom/Discord | 1.0.0 | 2026-05-18 | claude | 트리거 매칭 시 | rules 1 + commands 2 |
| custom/Notion | 1.0.0 | 2026-05-18 | claude | 트리거 매칭 시 | rules 1 + commands 2 |
| custom/Distribution | 1.0.0 | 2026-05-18 | claude | 트리거 매칭 시 | rules 2 + commands 1 |
| custom/CreateVault | 1.0.0 | 2026-05-18 | claude | 트리거 매칭 시 | rules 2 + commands 3 |
| custom/Canvas | 1.0.0 | 2026-05-19 | claude | 트리거 매칭 시 | rules 1 + commands 1 |

## 코어 (자동 sync + 자동 주입)

- 정본: `.agents/rules/core/`, `.agents/commands/core/`, `.agents/hooks/core/`
- sync 대상: `.claude/rules/core/`, `.claude/commands/core/`, `.claude/hooks/core/` + `.codex/rules/core/`, `.codex/skills/core/`
- 자동 주입: Claude (CWD ancestry) + Codex (AGENTS.md 명시 Read)

### 코어 룰 (12)

`_essentials.md`, `_skill-router.md`, `distribution-content-safety.md`, `distribution-sync.md`, `encoding-safety.md`, `juggl-style-sync.md`, `obsidian-config-safety.md`, `script-creation-approval.md`, `script-management.md`, `shell-redirect-safety.md`, `temp-file-management.md`, `user-guidance.md`

### 코어 스킬 (Phase 1.4 후 확정)

slash command 형태. `auto-organize`, `hub-broadcast`, `install-plugin`, `juggl-note`, `note-from-{article,pdf,video}`, `note-link`, `open-{note,notes,vault}`, `reindex`, `status-update`, `sync-all`, `vault-{health,route,update}`, `delegate-task`, `obsidian-windows`, `spawn-claude`

### 코어 hook (Phase 1.4 후 확정)

cross-platform CLI 통합 가능한 hook 만. Claude `.claude/hooks/` 의 9 파일 중 일부 후보 검토.

## 도메인 커스텀 (자동 sync + 트리거 매칭 시 Read)

각 도메인은 트리거 키워드 매칭 시 양 에이전트가 자기 위치 (`.claude/{rules,commands}/custom/{도메인}/` 또는 `.codex/{rules,skills}/custom/{도메인}/`) 의 mirror Read.

### Unity

- 버전: 1.0.0
- 트리거 키워드: Unity, C#, 유니티, 스크립트, 스킬 시스템, mcp-unity, unity-cli, Serena, find_symbol, replace_symbol_body, 심볼 기반 편집
- 정본 룰:
  - `.agents/rules/custom/Unity/unity-tools.md`
  - `.agents/rules/custom/Unity/unity-scripting-style.md`
  - `.agents/rules/custom/Unity/serena-mcp.md`
- 정본 스킬:
  - `.agents/commands/custom/Unity/unity-dev.md`
- sync 대상: `.claude/{rules,commands}/custom/Unity/`, `.codex/{rules,skills}/custom/Unity/`
- 적용 에이전트: Claude (Skill 도구), Codex (직접 Read)
- 도메인 볼트: `Vaults/Domains_Game/Unity/`

### Blender

- 버전: 1.0.0
- 트리거 키워드: Blender, 블렌더, 3D 모델링, bpy, Hyper3D, Polyhaven, Sketchfab
- 정본 룰: `.agents/rules/custom/Blender/blender-mcp.md`
- 정본 스킬: `.agents/commands/custom/Blender/blender-workflow.md`
- 도메인 볼트: `Vaults/Domains_3D/Blender/`

### Meshy

- 버전: 1.0.0
- 트리거 키워드: Meshy, AI 텍스처, 3D 생성, Meshy 크레딧, text-to-3d, image-to-3d
- 정본 룰: `.agents/rules/custom/Meshy/meshy-api.md`
- 정본 스킬:
  - `.agents/commands/custom/Meshy/meshy-workflow.md`
  - `.agents/commands/custom/Meshy/meshy-3d-agent/`
  - `.agents/commands/custom/Meshy/meshy-3d-generation/`
  - `.agents/commands/custom/Meshy/meshy-3d-printing/`
- 도메인 볼트: `Vaults/Domains_AI_Asset/AI_Gen4Game/` (Meshy 부분)

### Discord

- 버전: 1.0.0
- 트리거 키워드: Discord, 디스코드, 디코, 봇, AIMindVaults Admin Bot
- 정본 룰: `.agents/rules/custom/Discord/discord-bot.md`
- 정본 스킬:
  - `.agents/commands/custom/Discord/discord-admin.md`
  - `.agents/commands/custom/Discord/discord-manage.md`
- 도메인 볼트: `Vaults/Domains_Infra/Discord/`

### Notion

- 버전: 1.0.0
- 트리거 키워드: Notion, 노션, 작업 관리 DB
- 정본 룰: `.agents/rules/custom/Notion/notion-sync.md`
- 정본 스킬:
  - `.agents/commands/custom/Notion/notion-record.md`
  - (참고) Claude 측 `/notion` 스킬은 `~/.claude/commands/` 에 별도 (전역)
- 도메인 볼트: `Vaults/Domains_Infra/Notion/`

### Distribution

- 버전: 1.0.0
- 트리거 키워드: 배포, SellingVault, git push, distribute, deploy
- 정본 룰:
  - `.agents/rules/custom/Distribution/distribution-deploy.md`
  - `.agents/rules/custom/Distribution/sync-version-priority.md`
- 정본 스킬: `.agents/commands/custom/Distribution/distribute.md`
- 도메인 볼트: 없음 (인프라 도메인)

### CreateVault

- 버전: 1.0.0
- 트리거 키워드: 볼트 생성, create-vault, 새 볼트, 볼트 분리, 신규 볼트
- 정본 룰:
  - `.agents/rules/custom/CreateVault/vault-individualization.md`
- 정본 스킬:
  - `.agents/commands/custom/CreateVault/create-vault.md`
  - `.agents/commands/custom/CreateVault/create-preset-hub.md`
  - `.agents/commands/custom/CreateVault/register-vaults.md`
- 도메인 볼트: 없음 (인프라 도메인)

### Canvas

- 버전: 1.0.0
- 트리거 키워드: 캔버스, 구조도, 다이어그램, advanced canvas, Obsidian Canvas, .canvas, 노드 + 엣지, 시스템 도식
- 정본 룰: `.agents/rules/custom/Canvas/canvas-design.md`
- 정본 스킬: `.agents/commands/custom/Canvas/canvas-create.md`
- 도메인 볼트: 없음 (인프라 도메인 — 모든 볼트에서 적용 가능)
- 참조 캔버스: `Vaults/Lab_Infra/ObsidianDev/Contents/Domain/reference/advanced_canvas/AdvancedCanvas_아키텍처.canvas`

## 향후 도메인 볼트 추가 시

새 도메인 볼트 (`Vaults/Domains_*/X` 또는 `Vaults/Domain_*/X`) 생성 시 대응 카테고리 폴더 `.agents/{rules,commands}/custom/X/` 자동 생성 정책 (Phase 2 또는 별 트랙 자동화).

현재 룰/스킬 없는 도메인 볼트 (GameDesign, CapCut, Git, GameArt, CICD, Search, AI, AppFlowy, Cooking, Overseas, Exercise, MachineAssembly, LightAndColor, ArtInsight, Funding, Python, AI_Coding, JavaScript, DevFoundation 등) 는 카테고리 폴더 없음. 룰/스킬 신설 시 카테고리 동시 생성.

## 에이전트별 sync 매트릭스

| 영역 | Claude 미러 위치 | Codex 미러 위치 | 자동 주입 |
|------|---------------|--------------|--------|
| rules/core | `.claude/rules/core/` | `.codex/rules/core/` | ★ 매 세션 |
| commands/core | `.claude/commands/core/` | `.codex/skills/core/` | ★ 매 세션 (스킬 등록) |
| hooks/core | `.claude/hooks/core/` | (CoreHub CLI 통합 대체) | Claude hook |
| rules/custom/{도메인} | `.claude/rules/custom/{도메인}/` | `.codex/rules/custom/{도메인}/` | 트리거 매칭 시 Read |
| commands/custom/{도메인} | `.claude/commands/custom/{도메인}/` | `.codex/skills/custom/{도메인}/` | 트리거 매칭 시 Read |

## agents-sync CLI 호출 패턴

```bash
# 코어·도메인 일괄 sync
node "{CoreHub}/.sync/_tools/cli-node/bin/cli.js" agents-sync [--dry-run|--apply|--verify]

# 특정 영역만 sync
node ... agents-sync --area Unity
node ... agents-sync --area core

# 버전 bump 레벨 명시
node ... agents-sync --bump minor
```

## 검증

- `agents-sync --verify` exit 0 = 미러 drift 0
- 새 세션 진입 시 hook (Claude) 또는 룰 (Codex) 자동 호출 → drift 자동 보고/갱신

## 참조

- 설계 plan: [[20260518_에이전트_공용공간_및_자동갱신_설계]]
- 신설 배경: [[20260515_claude_claude_에이전트_하네스_공용공간_자동갱신_루틴]]
- README: `.agents/README.md`
- R112 (5-12 신설): `_ROOT_VERSION.md`
- R122 (Phase 1 진입): `_ROOT_VERSION.md` (등록 예정)
