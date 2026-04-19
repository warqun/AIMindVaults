# 컨텍스트 창 최적화 가이드

AIMindVaults는 규칙 주입 구조를 세션 라이프사이클에 맞춰 최적화하여, AI 에이전트의 컨텍스트 창을 가볍게 유지하는 것을 기본값으로 제공합니다.

이 문서는 추가로 사용자 환경(MCP 서버, 플러그인)을 최적화하여 더 많은 여유 공간을 확보하는 방법을 설명합니다.

---

## 왜 중요한가

Claude Code와 같은 AI 에이전트는 세션 시작 시 다음을 자동 주입합니다.

- **Memory files**: `CLAUDE.md`, `.claude/rules/core/` 등 항상 로드되는 규칙
- **MCP tools**: 등록된 MCP 서버의 모든 도구 스키마 (사용하지 않아도 주입됨)
- **Custom agents / Skills**: 설치된 플러그인의 에이전트·스킬 메타데이터

이들이 많을수록 **컨텍스트 창의 베이스라인**이 커지고, 실제 대화와 작업에 쓸 수 있는 공간이 줄어듭니다. 1M 컨텍스트라도 베이스라인이 170k면 자유 공간은 ~830k로 출발합니다.

AIMindVaults 기본 구조는 **Memory files를 ~23k로 유지**하지만, 사용자가 설치한 MCP 서버·플러그인이 베이스라인을 크게 늘릴 수 있습니다.

---

## 규칙 주입 구조 (기본 제공)

AIMindVaults 배포본은 세 층으로 규칙을 분리합니다.

### 상시 주입 (`core/`, 모든 세션)

| 파일 | 역할 |
|------|------|
| `_essentials.md` | 통합 코어 (보고 언어, 토큰 절약, 볼트 라우팅, 편집 모드, 노트 작성, 세션 종료) |
| `_skill-router.md` | 트리거 키워드 → Skill 호출 / 규칙 파일 매핑 |
| `distribution-sync.md` | 배포 동기화 규칙 |
| `encoding-safety.md` | 인코딩 안전 (자기교정 즉시 차단) |
| `juggl-style-sync.md` | Juggl 스타일 규칙 |
| `obsidian-config-safety.md` | `.obsidian/` 편집 안전 |
| `script-creation-approval.md` | 스크립트 생성 사전 승인 |
| `script-management.md` | 스크립트 관리 |
| `temp-file-management.md` | 임시 파일 관리 (MAX_PATH incident 포함) |
| `user-guidance.md` | 유저 가이드 (고위험 6섹션 슬림 버전) |

### 조건부 로드 (`rules-archive/`, 트리거 시만 Read)

- `token-optimization.md`, `session-exit.md`, `note-writing.md`, `vault-routing.md`, `post-edit-review.md`, `edit-mode-separation.md` — `_essentials.md`에 요약 통합, 상세는 필요 시
- `vault-individualization.md` — `/create-vault` Skill 호출 시
- `user-guidance-detail.md` — 저위험 트리거(§1, §3, §6, §7, §9, §12) 감지 시

### 개인 확장 (`custom/`, 사용자 자유)

- `.claude/rules/custom/` — 개인 규칙 파일
- `.claude/commands/custom/` — 개인 Skill

이 구조로 **기존 45k → 23k** 수준의 Memory files를 달성합니다.

---

## MCP 서버 최적화

### 현상

Claude Code 전역 `~/.claude/settings.json`에 등록한 MCP 서버는 **모든 프로젝트 세션**에서 도구 스키마를 주입합니다. 사용하지 않아도 주입됩니다.

예시: MCP 서버 7개 등록 시 베이스라인에 ~67k 토큰 추가.

### 원칙

**전역에는 상시 필요한 서버만. 도메인 전용 서버는 해당 프로젝트로 이동.**

| 구분 | 전역 | 프로젝트별 |
|------|------|------------|
| 상시 필요 | ✅ | |
| 특정 도메인 (Unity, Blender 등) | | ✅ 해당 프로젝트 `.claude/settings.json` |
| 미사용 | 제거 | 제거 |

### 적용 방법

**1. 전역에서 도메인 전용 서버 제거**

`~/.claude/settings.json` → `mcpServers`에서 도메인 서버 항목 삭제.

```json
{
  "mcpServers": {
    "notion": { "command": "npx", "args": ["-y", "@notionhq/notion-mcp-server"] }
  }
}
```

**2. 프로젝트별로 서버 재정의**

프로젝트 루트에 `.claude/settings.json` 생성:

```json
{
  "mcpServers": {
    "blender": {
      "command": "uvx",
      "args": ["blender-mcp"]
    }
  }
}
```

해당 프로젝트를 CWD로 Claude Code 실행 시에만 이 서버가 로드됩니다.

### 예시: AIMindVaults 기본 권장

- **전역**: `notion`만 (원고·기록 관리에 상시 사용)
- **AIMindVaults 프로젝트**: `blender`, `youtube-transcript` 등 영상/3D 노트 작업용
- **Unity 게임 프로젝트**: `mcp-unity`, `serena` 등 Unity 에디터 조작용
- **완전 제거**: 미사용 서버 (`playwright`, `context7` 등)

---

## 플러그인 최적화

### 현상

Claude Code 플러그인은 **Custom agents + Skills**를 주입합니다. bkit 같은 대형 플러그인은 한 번 활성화 시 ~7k 토큰을 차지합니다.

### 원칙

**프로젝트 성격에 맞는 플러그인만 해당 프로젝트에서 활성화.**

### 적용 방법

**1. 전역에서 비활성**

`~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "bkit@bkit-marketplace": false
  }
}
```

**2. 필요한 프로젝트에서만 재활성**

프로젝트 `.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "bkit@bkit-marketplace": true
  }
}
```

### 예시: bkit 플러그인

bkit은 PDCA 기반 개발 워크플로우용입니다. Obsidian 지식 관리가 주된 AIMindVaults 루트 작업에는 필요 없지만, 게임 개발 툴킷 볼트나 풀스택 프로젝트에서는 유용합니다.

- **전역**: 비활성
- **게임 툴킷 볼트 작업 시**: AIMindVaults 루트 `.claude/settings.json`에 활성
- **별도 게임 엔진 프로젝트**: 해당 프로젝트 `.claude/settings.json`에 활성

---

## Desktop / Claude.ai 커넥터

다음은 Claude Code 설정으로 제어하지 않는 영역입니다. Claude Desktop 앱이나 Claude.ai 계정에서 직접 관리합니다.

- Desktop 앱 MCP (예: `Claude_Preview`, `ccd_directory`, `mcp-registry`, `scheduled-tasks`)
- Claude.ai Connectors (예: `calendar`, `gmail`, `microsoft_docs`)

**권장**: 사용하지 않는 항목은 Desktop 앱 설정 또는 Claude.ai Settings → Connectors에서 비활성.

---

## 실측

변경 후 Claude Code 재시작 → `/context` 명령으로 베이스라인 확인.

### 참고 수치 (기본 세팅 기준)

AIMindVaults 배포본만 clone 한 뒤 추가 MCP 서버·플러그인을 등록하지 않은 상태에서 루트 세션을 측정한 예시:

```
Tokens: ~46k / 1m (~5%)

Estimated usage by category:
  System prompt ............ ~8k
  System tools ............. ~11k
  Memory files ............. ~23k
  MCP tools (deferred) ..... 가변 (실제 주입되지 않음)
  Skills ................... ~2k
  Free space ............... ~920k
```

> 사용자가 MCP 서버·플러그인을 추가할수록 베이스라인이 증가합니다. 위 수치는 출발점입니다.

### 해석

- **Memory files ~23k**: core 상시 주입 + archive 조건부 로드 구조의 기본 효과.
- **Deferred tools는 토큰 실소비 없음**: 최신 Claude Code는 MCP/시스템 도구 스키마를 `ToolSearch` 호출 시에만 로드하는 Deferred 아키텍처를 사용합니다. `/context`에 표시되어도 실제 컨텍스트를 소비하지 않으므로, Deferred로 분류된 MCP 도구는 더 이상 베이스라인 압박 요인이 아닙니다.
- **실효 베이스라인 ~46k**: 대화 시작 시 실제 사용 토큰. 1M 컨텍스트 중 ~920k가 자유 공간.

### 목표치

| 지표 | 최적화 전 | 최적화 후 |
|------|----------|----------|
| Memory files | ~45k | ~23k (기본 제공) |
| MCP tools (active) | ~67k | Deferred 아키텍처로 실소비 없음 |
| Skills | ~6k | ~2k 이하 |
| **실효 베이스라인** | ~170k | **~50k 이하** |

> MCP 서버를 프로젝트별로 분리 등록하거나 불필요한 플러그인을 비활성화하면 위 수준을 유지할 수 있습니다.

---

## 백업

설정 변경 전 백업 필수:

```bash
cp ~/.claude/settings.json ~/.claude/settings.json.backup-$(date +%Y%m%d)
```

복원:

```bash
cp ~/.claude/settings.json.backup-YYYYMMDD ~/.claude/settings.json
```

---

## 참조

- [architecture.md](architecture.md) — 시스템 전체 구조
- [customization.md](customization.md) — 사용자 커스터마이징
- [cli-reference.md](cli-reference.md) — CLI 커맨드 레퍼런스
