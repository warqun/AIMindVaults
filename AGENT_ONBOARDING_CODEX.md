# AIMindVaults — Codex 온보딩

> Codex 데스크탑 앱 / Codex CLI 전용 온보딩 문서.
> 공통 규칙은 `AGENT_ONBOARDING.md`를 먼저 읽는다.

---

## 1. 진입점

- **루트 진입점**: `AGENTS.md` — 볼트 레지스트리 (22볼트), 라우팅 규칙, 스킬 목록
- **레거시**: `CODEX.md` → `AGENTS.md`로 리다이렉트
- **내부 라우팅**: `.codex/CODEX.md` — Codex 규칙 참조 허브

## 2. 세션 시작 순서

1. `AGENTS.md` (루트) — Codex 메인 진입점
2. `.claude/rules/` 전체 — 공통 강제 규칙 (정본, 모든 에이전트 적용)
3. `_STATUS.md` (루트) — 전체 볼트 현황
4. `.codex/rules/` — Codex 고유 규칙
5. `.codex/AGENT_STATUS.md` — Codex 상태
6. 대상 볼트의 `AGENTS.md` 또는 `CLAUDE.md`
7. 대상 볼트의 `_STATUS.md`

편집 전에 위 순서를 완료한다.

---

## 3. 에이전트 식별

- **식별자**: `codex`
- frontmatter `agent: codex` (복수 에이전트 작업 시 `agent: [claude, codex]`)
- 세션 종료 시 `_STATUS.md`에 `codex / YYYY-MM-DD`로 기록
- 핸드오프 파일: `_SESSION_HANDOFF_CODEX.md`
- 상태 파일: `.codex/AGENT_STATUS.md`

---

## 4. 읽기 전용 기본 정책 (Codex 고유)

- 사용자가 프롬프트에서 **작업(생성/수정/삭제/실행)** 을 명시하지 않으면, Codex는 **읽기 전용**으로만 동작한다.
- 읽기 전용 범위: 파일 탐색, 내용 조회, 상태 점검, 비교, 요약, 보고.
- 명시 지시 전 금지: 파일 변경, 자동화 등록/실행, 쓰기성 스크립트 실행, 외부 상태 변경.
- 지시가 모호하면 변경 작업을 시작하지 않고 짧게 확인한다.

---

## 5. Codex 역할 범위

| 영역 | Codex | Claude Code |
|------|-------|-------------|
| 단일 볼트 내 노트 편집 (`Contents/`) | O | O |
| 소스 노트 파이프라인 (영상/글/PDF → 노트) | O | O |
| 반복 작업 (frontmatter 일괄 갱신, Juggl 삽입 등) | O | O |
| 백그라운드 정리 (링크/태그 정리) | O | X (주로) |
| 멀티볼트 구조 변경 | X | O |
| 스크립트 개발/수정 | X | O |
| `.obsidian/` 설정 변경 | X | O |

### 동시 수정 금지 영역

아래 파일은 한 에이전트만 수정할 수 있다:

| 파일 | 사유 |
|------|------|
| `_STATUS.md` (볼트/루트) | 상태 추적의 단일 소스 |
| `_WORKSPACE_VERSION.md` | 버전 번호 충돌 |
| `.obsidian/**` | JSON 병합 불가 |
| `_VAULT-INDEX.md` | 동시 편집 시 구조 깨짐 |

---

## 6. Codex 스킬 (`.codex/skills/` — 7개)

| 스킬 | 용도 | 실행 방법 |
|------|------|----------|
| `create-video-note` | 영상 URL → 구조화된 노트 | `.codex/skills/create-video-note/SKILL.md` 참조 |
| `create-article-note` | 웹 글/텍스트 → 구조화된 노트 | `.codex/skills/create-article-note/SKILL.md` 참조 |
| `create-pdf-note` | PDF → 구조화된 노트 | `.codex/skills/create-pdf-note/SKILL.md` 참조 |
| `cross-vault-migration` | 볼트 간 노트 이관 | `.codex/skills/cross-vault-migration/SKILL.md` 참조 |
| `sync-distribution` | 배포 동기화 | `.codex/skills/sync-distribution/SKILL.md` 참조 |
| `open-note` | Obsidian 노트 열기 | `.codex/skills/open-note.md` 참조 |
| `open-vault` | Obsidian 볼트 열기 | `.codex/skills/open-vault.md` 참조 |

각 스킬은 단계별 절차가 문서화되어 있다. 해당 SKILL.md를 읽고 순서대로 실행하면 된다.

---

## 7. Codex 전용 규칙 (`.codex/rules/` — 4개)

| 규칙 | 핵심 |
|------|------|
| `vault-routing.md` | AIHubVault → workspace, 기타 → 키워드 추론 또는 사용자 확인 |
| `edit-scope.md` | 루트 스코프 정의, workspace는 AIHubVault 전용, 세션 종료 절차 |
| `status-sync.md` | 루트 상태 vs 볼트 상태 분리 원칙 |
| `encoding-safety.md` | UTF-8 안전, Get-Content 파이프라인 금지, mojibake 발생 시 즉시 중단 |

이 규칙들은 `.claude/rules/core/`의 공통 규칙을 **보완**한다. 공통 규칙이 우선.

---

## 8. 설정 구조

```
.codex/
├── CODEX.md            ← 내부 라우팅 허브 (세션 순서, 볼트 레지스트리)
├── AGENT_STATUS.md     ← Codex 상태 (복잡한 작업 시 갱신)
├── rules/              ← Codex 전용 규칙 4개
│   ├── vault-routing.md
│   ├── edit-scope.md
│   ├── status-sync.md
│   └── encoding-safety.md
└── skills/             ← Codex 전용 스킬 7개
    ├── create-video-note/SKILL.md
    ├── create-article-note/SKILL.md
    ├── create-pdf-note/SKILL.md
    ├── cross-vault-migration/SKILL.md
    ├── sync-distribution/SKILL.md
    ├── open-note.md
    └── open-vault.md
```

---

## 9. 공통 규칙 적용

Codex도 `.claude/rules/core/`의 강제 규칙을 모두 따른다.
`AGENTS.md` §공통 규칙에 명시: "세션 시작 시 `.claude/rules/` 디렉토리의 모든 규칙 파일을 읽고 따른다."

### Skill Router 동적 로드 (Codex 동작)

공통 온보딩 §15 "규칙 동적 로드 구조"의 Codex 실행 방식:

- 매 사용자 메시지마다 `.claude/rules/core/_skill-router.md` 테이블을 검토한다.
- 매칭되는 트리거 키워드가 있으면 테이블의 `.claude/rules-archive/` 규칙 파일을 Read로 로드한다.
- Skill 호출 행(Claude Code 전용)은 해당 Skill이 통합한 archive 규칙들을 직접 Read로 대체한다.
- 세션 내 이미 읽은 archive 파일은 재로드하지 않는다.

주요 규칙 요약:

| 규칙 | Codex 적용 시 핵심 |
|------|-------------------|
| Post-Edit Review | 노트 편집 후 `aimv review` 실행 + 인덱싱 완료 |
| 편집 모드 분리 | Contents 모드로 노트 편집, workspace 편집은 AIHubVault 전용 |
| 세션 종료 | 볼트 + 루트 `_STATUS.md` 양쪽 갱신 + 핸드오프 파일 작성 |
| 토큰 절약 | 핀포인트 접근, 반복 읽기 금지, 고비용 작업 사전 승인 |
| 스크립트 생성 | 사용자 승인 없이 생성 금지 |

전체 목록: `AGENT_ONBOARDING.md` §규칙 상세 참조 테이블.

---

## 10. Serena MCP — 시맨틱 코드 분석 (사용자 환경에 따라)

Serena MCP 서버가 연결되어 있는 경우, C# 코드를 심볼 단위로 탐색·수정할 수 있다.

| 도구 | 용도 |
|------|------|
| `get_symbols_overview` | 파일 내 클래스/메서드 목록 조회 |
| `find_symbol` | 심볼 이름으로 검색 |
| `find_referencing_symbols` | 특정 심볼을 참조하는 곳 찾기 |
| `search_for_pattern` | 코드 패턴 검색 |
| `replace_symbol_body` | 심볼 본문 교체 |

파일 전체 읽기 전에 `get_symbols_overview`로 구조를 먼저 파악한다.
상세: `AGENTS.md` §Serena MCP 또는 `.claude/rules/custom/serena-mcp.md`
