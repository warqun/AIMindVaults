# AIMindVaults — 멀티볼트 라우팅 허브

> 이 디렉토리는 여러 Obsidian 볼트를 관리하는 최상위 작업 디렉토리.
> 개별 볼트 작업 시 반드시 볼트 진입 프로토콜을 따른다.
> 공통 강제 규칙은 `.claude/rules/`에 정의되어 자동 적용.

## 볼트 레지스트리

### BasicVaults (작업환경 허브)

| 볼트 ID | 경로 | 역할 | 상태 |
|---------|------|------|------|
| AIHubVault | `Vaults/BasicVaults/AIHubVault/` | **작업환경 원본(Hub)** — AI 작업환경 설계·개선·배포 허브 | active |
| BasicContentsVault | `Vaults/BasicVaults/BasicContentsVault/` | 범용 콘텐츠 저장소 | active |

> 새 볼트는 `/create-vault` 스킬로 생성한다. Domain, Lab, Project 등 용도별 카테고리로 자동 배치된다.

### 기타 루트 폴더

| 폴더 | 용도 |
|------|------|
| `Backup/` | 백업 |

## 볼트 진입 프로토콜 (강제)

1. **대상 볼트 식별**
   - 명시적 지정: "AIHubVault에서 ~", "BasicContentsVault ~"
   - 키워드 추론:
     - "AI 워크플로우", "에이전트", "_Standards", "_forge", "workspace" → AIHubVault (workspace 전용 Hub)
     - "콘텐츠", "노트 작성", "지식 관리" → BasicContentsVault
     - 기타 도메인/프로젝트 키워드 → `_STATUS.md` 볼트 레지스트리에서 대상 볼트 확인. 없으면 `/create-vault`로 생성 안내.
   - 파일 경로 포함 시 → 경로에서 볼트 추출
   - 모호하면 → 사용자에게 확인

2. **볼트 진입 시 필수 읽기** (순서대로)
   - `_STATUS.md` (루트) — 전체 볼트 현황 파악 + 다른 볼트 작업과 충돌/연계 확인
   - `{볼트경로}/CLAUDE.md` — 볼트 전용 규칙
   - `{볼트경로}/_STATUS.md` — 현재 진행 상황

3. **작업환경 동기화 검토** (대상 볼트 ≠ AIHubVault인 경우)
   - `{볼트경로}/_WORKSPACE_VERSION.md` 최상단 버전과 AIHubVault의 최상단 버전 비교
   - 차이 있으면 → AIHubVault 기준으로 동기화 수행 후 작업 시작
   - 상세 프로토콜: AIHubVault `Contents/Project/plan/AIMindVaults_plan/20260311_허브_동기화_계획.md`

4. **교차 작업 규칙**
   - 2개 이상 볼트를 수정하는 경우, 볼트별로 분리하여 순차 실행
   - 볼트 전환 시 현재 볼트의 편집을 완결한 후 전환

## 루트 작업 범위

루트에서 직접 수정 가능한 대상:
- `_STATUS.md` (멀티볼트 상태 허브)
- `CLAUDE.md` (이 파일)
- `CODEX.md` (Codex 루트 진입점)
- `.claude/` (루트 Claude 설정)
- `.codex/` (루트 Codex 설정)
- `.cursor/` (루트 Cursor 설정)
- `docs/` (루트 문서)

볼트 내부 파일은 볼트 진입 프로토콜을 거친 후에만 수정한다.

## 공통 강제 규칙 참조

아래 규칙은 `.claude/rules/core/`에 정의되어 모든 볼트에 자동 적용:
- 인코딩 안전 (`encoding-safety.md`)
- 편집 모드 분리 (`edit-mode-separation.md`)
- Post-Edit Review (`post-edit-review.md`)
- 스크립트 관리 (`script-management.md`)
- Juggl 스타일 동기화 (`juggl-style-sync.md`)
- 노트 작성 패턴 (`note-writing.md`)
- 볼트 라우팅 (`vault-routing.md`)
- 세션 종료 (`session-exit.md`)
- 토큰 최적화 (`token-optimization.md`)
- 임시 파일 관리 (`temp-file-management.md`)
- 스크립트 생성 승인 (`script-creation-approval.md`)
- 배포 동기화 (`distribution-sync.md`)
- Obsidian 설정 안전 편집 (`obsidian-config-safety.md`)

### 네임스페이스 구조

```
.claude/rules/core/     ← 배포 규칙 (동기화 대상)
.claude/rules/custom/   ← 사용자 규칙 (동기화 미대상)
.claude/commands/core/   ← 배포 스킬 (동기화 대상)
.claude/commands/custom/ ← 사용자 스킬 (동기화 미대상)
```

각 폴더의 `MANIFEST.md`에 배포 파일 목록이 명시되어 있다.
