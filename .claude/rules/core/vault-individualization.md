# 볼트 개별화 (Mandatory)

> 모든 볼트 생성 시 적용. 볼트의 용도와 주제에 맞게 개별 설정을 구체화하는 규칙.

## 볼트 생성 시 필수 결정 항목

### 1. 볼트명

- 역할이 즉시 파악되는 이름 사용.
- URI 예약문자(`#`, `%`, `&`, `?`, `+`) 및 이모지 금지.
- 예: `Unity`, `AppFlowy`, `Project_VamSurLike`

### 2. 상위 폴더 분류

볼트의 성격에 따라 적절한 상위 폴더에 배치:

| 분류 | 경로 | 기준 |
|------|------|------|
| Domains_Game | `Vaults/Domains_Game/` | 게임 관련 도메인 지식 |
| Domains_Video | `Vaults/Domains_Video/` | 영상/미디어 도메인 지식 |
| Domains_Infra | `Vaults/Domains_Infra/` | 인프라/도구 도메인 지식 |
| Projects_Game | `Vaults/Projects_Game/` | 게임 프로젝트 작업물 |
| Projects_Infra | `Vaults/Projects_Infra/` | 인프라 프로젝트 작업물 |
| Lab_Infra | `Vaults/Lab_Infra/` | 도메인+프로젝트 복합 (플러그인 개발 등) |
| Personal | `Vaults/Personal/` | 개인 기록 |
| BasicVaults | `Vaults/BasicVaults/` | 시스템 볼트 (Hub, 배포본) |

새 분류가 필요하면 사용자에게 확인 후 생성.

### 3. CLAUDE.md 작성

볼트 역할에 맞게 CLAUDE.md를 개별 작성:

- **이 볼트의 역할**: 1~2줄로 명확히
- **디렉토리 구조**: Contents/ 하위 폴더 구조
- **태그 규칙**: 볼트 식별 태그 지정
- **세션 진입 규칙**: _STATUS.md 선독 필수 포함

### 4. 콘텐츠 구조 결정

볼트 타입에 따라 Contents/ 하위 구조를 설정:

- **Domain 볼트**: `Contents/Domain/` 하위에 주제별 폴더
- **Project 볼트**: `Contents/Project/plan/`, `Contents/Project/idea/` 등
- 구조는 볼트 용도에 맞게 자유롭게 설정하되, `_VAULT-INDEX.md`에 등록

### 5. 태그 규칙

- 볼트 식별 태그를 1개 지정 (예: `Unity`, `AppFlowy`, `Project_VamSurLike`)
- 모든 노트의 frontmatter `tags`에 이 태그를 필수 포함

## 볼트 생성 후 필수 작업

1. workspace 동기화 실행 (Hub에서 Core 파일 전파)
2. 루트 `_STATUS.md` 볼트 레지스트리에 등록
3. 루트 `CLAUDE.md` 볼트 진입 프로토콜에 키워드 추가

## 배포 동기화 대상 제외 항목

볼트 개별 파일은 배포 동기화에 포함하지 않는다:

- `CLAUDE.md` (볼트별 내용 다름)
- `CODEX.md` (에이전트 선택에 따라 다름)
- `AGENT_STATUS.md` (에이전트 선택에 따라 다름)
- `_STATUS.md` (볼트별 상태 다름)
- `_VAULT-INDEX.md` (볼트별 구조 다름)
- `_Standards/CONTENTS_SPEC.md` (볼트별 콘텐츠 범위 다름)
