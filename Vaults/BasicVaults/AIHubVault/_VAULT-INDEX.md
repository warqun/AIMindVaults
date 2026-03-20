---
aliases:
  - "Vault 인덱스"
  - "보관함 지도"
tags:
  - AIMindVault
  - Meta
type: _VAULT-INDEX
updated: 2026-03-11
agent: antigravity
---

# _VAULT-INDEX — 작업환경 인덱스

> 에이전트가 이 Vault에서 "작업환경이 어디 있는지" 파악하기 위한 지도.
> 콘텐츠 구조는 `Contents/CONTENTS_INDEX.md`를 참조.
> 멀티볼트 루트 진입점은 루트 `CODEX.md` 또는 `CLAUDE.md`.

---

## 1. Vault 루트 구조

```
{VaultName}/
├── CLAUDE.md            ← 볼트 전용 Claude 진입점
├── CODEX.md             ← 볼트 전용 Codex 진입점
├── _VAULT-INDEX.md       ← 이 파일 (작업환경 인덱스)
├── _STATUS.md            ← 마스터 진행 현황
├── _WORKFLOW.md          ← Vault 운용 규칙
├── _WORKSPACE_VERSION.md ← 작업환경 버전 추적
├── _forge/              ← 작업환경 배포 허브 (inbox/staging/tasks)
├── _tools/               ← 자동화 스크립트·CLI 도구
├── _Standards/           ← Vault 일관성 기준
├── _VaultReview/         ← 에이전트 생성 검토 보고서
├── Tags/                ← 태그 노트
├── Juggl_StyleGuide/    ← Juggl 매핑 가이드 (범용 템플릿)
├── CLI_MEMORY/          ← CLI 에이전트 메모리
├── Contents/            ← 볼트 콘텐츠 (상세: Contents/CONTENTS_INDEX.md)
├── .claude/
│   ├── commands/        ← 프로젝트 전용 스킬
│   └── rules/           ← 자동 적용 규칙
├── .codex/              ← Codex 전용 메모리/상태
└── .antigravity/        ← Antigravity 전용 메모리/상태
```

---

## 2. _Standards/ 일관성 기준

| 파일/폴더 | 내용 |
|-----------|------|
| `Core/WritingStandards.md` | 파일명·폴더·Frontmatter·상태 아이콘·표·링크 등 전체 작성 기준 |
| `Core/NoteProperties.md` | 노트 속성(Frontmatter) 필드 정의·체크리스트 — **AI 노트 생성 시 필독** |
| `Core/MultiAgent_Coordination_Pattern.md` | 멀티 에이전트 협업 패턴 참조 자료 |
| `Core/AI_ObsidianCLI_Usage.md` | AI-First Obsidian CLI 운용 기준 |
| `Core/AI_Collaboration_Strategy.md` | AI 협업 전략 |
| `Core/AI_Note_Environment.md` | AI 노트 환경 설정 |
| `Core/Encoding_BulkEdit_Safety.md` | 인코딩 안전 규칙 (대량 수정) |
| `Core/Grok_Usage_Guidelines.md` | Grok 활용 가이드라인 |
| `Core/OLLAMA_ORCHESTRATION_GUIDE.md` | Ollama 오케스트레이션 구성/프롬프트 가이드 |
| `Core/Juggl_StyleGuide_Operations.md` | Juggl 스타일 동기화 운영 규칙 |
| `Core/Obsidian_CLI_Command_List.md` | Obsidian CLI 명령어 목록 |
| `Core/Obsidian_Plugin_Environment.md` | Obsidian 플러그인 환경 |
| `Core/Pre_Prompt_Commands.md` | 사전 프롬프트 명령어 |
| `Core/Script_Creation_Rule.md` | 스크립트 생성/관리 규칙 |
| `Core/Script_Registry.md` | 스크립트 등록 대장 |
| `Core/Operations/` | 운영 체크리스트 |
| `Core/Plugins/` | 플러그인 기능/문법 인덱스 |
| `Core/NoteTemplates/` | 노트 템플릿 폴더 |
| `Core/VaultTypes/` | 볼트 타입 스펙 (Domain / Project) |
| `CONTENTS_SPEC.md` | 볼트 정체성·콘텐츠 범위 정의 (볼트 고유) |
| `Contents/` | 볼트 전용 커스텀 규칙 (볼트 고유) |

---

## 3. _forge/ 배포 허브

| 폴더 | 용도 |
|------|------|
| `inbox/` | 외부 에이전트 결과물 수신 대기 |
| `staging/` | 배포 전 검토·준비 완료된 스크립트·설정 |
| `tasks/` | 배포 관련 작업 지시 초안 |

---

## 4. _VaultReview/ 검토 보고서

> 에이전트가 생성한 Vault 분석·검토 문서. 의사결정에 참고.

---

> 이 파일은 **허브 동기화 대상**입니다. AIHubVault가 원본.
> 구조 변경 시 이 파일도 함께 업데이트할 것.
