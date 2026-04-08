# 볼트 개별화 (Mandatory)

> 모든 볼트 생성 시 적용. 볼트의 용도와 주제에 맞게 개별 설정을 구체화하는 규칙.

## 볼트 생성 방법 (강제)

**모든 새 볼트는 `clone_vault.ps1`로 BasicContentsVault를 클론하여 생성한다.**

- 소스: `Vaults/BasicVaults/BasicContentsVault/` (범용 볼트 템플릿)
- 도구: `BasicContentsVault/_tools/clone_vault.ps1`
- 폴더를 수동 복사(`Copy-Item`, `cp`, `xcopy` 등)하지 않는다.
- AIHubVault는 소스로 사용하지 않는다 (작업환경 허브라 구조가 무거움).

```
powershell -ExecutionPolicy Bypass -File "<BasicContentsVault경로>/_tools/clone_vault.ps1" -TargetPath "<대상경로>" -ProjectName "<볼트명>"
```

이 스크립트가 처리하는 항목:
- `.git`, 캐시, 동기화 폴더 제외 복사 (robocopy)
- 디바이스별 플러그인 설정 자동 제거 (obsidian-git, claudian)
- make-md systemName 자동 갱신

클론 완료 후 아래 **필수 결정 항목**과 **필수 작업**을 수행한다.

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
| Projects_GameTool | `Vaults/Projects_GameTool/` | 게임 개발 도구/툴킷 프로젝트 |
| Projects_Game | `Vaults/Projects_Game/` | 게임 개발 프로젝트 |
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
4. **초기 콘텐츠 인덱스 빌드** (강제):
```powershell
powershell -ExecutionPolicy Bypass -File "{볼트경로}/.sync/_tools/cli/vault_index_build.ps1" -VaultRoot "{볼트경로}"
```
   - 인덱서 스크립트가 없으면 workspace 동기화가 안 된 것이므로 1번부터 재확인
   - 빌드 완료 후 `vault_index.json` 생성을 확인

## 배포 동기화 대상 제외 항목

볼트 개별 파일은 배포 동기화에 포함하지 않는다:

- `CLAUDE.md` (볼트별 내용 다름)
- `CODEX.md` (에이전트 선택에 따라 다름)
- `AGENT_STATUS.md` (에이전트 선택에 따라 다름)
- `_STATUS.md` (볼트별 상태 다름)
- `_VAULT-INDEX.md` (볼트별 구조 다름)
- `_Standards/CONTENTS_SPEC.md` (볼트별 콘텐츠 범위 다름)
