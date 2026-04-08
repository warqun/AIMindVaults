# 볼트 라우팅 (Mandatory)

> 모든 볼트에 동일 적용. 모든 에이전트 공통.

## 콘텐츠 배치 전 필수 확인

- 노트/콘텐츠를 생성하기 전에 **루트 `_STATUS.md` 볼트 레지스트리**를 확인하여 적절한 볼트를 선택한다.
- 루트 `CLAUDE.md`의 볼트 진입 프로토콜도 참조한다.

## 금지 볼트

- **BasicContentsVault**: AIHubVault의 배포용 복제 볼트. 직접 콘텐츠 작업 금지. `/create-vault` 스킬 전용.

## 미등록 볼트 발견 시

- 루트 `_STATUS.md` 볼트 레지스트리에 없는 볼트에 처음 접근하면, 즉시 레지스트리에 등록한다.
- 등록 항목: 볼트명, 타입 (카테고리에서 추론), 콘텐츠 설명, 작업 에이전트
- 사용자가 직접 생성한 볼트도 동일하게 적용.

## 볼트 첫 접근 시 인덱스 빌드 (강제)

에이전트가 볼트에 처음 접근할 때 (신규 생성이든, 사용자가 만든 볼트든) `vault_index.json`이 없으면 **콘텐츠 인덱스를 빌드**한다.

```powershell
powershell -ExecutionPolicy Bypass -File "{볼트경로}/.sync/_tools/cli/vault_index_build.ps1" -VaultRoot "{볼트경로}"
```

- 인덱서 스크립트(`.sync/_tools/cli/vault_index_build.ps1`)가 없으면 스킵하고 로그 남김
- 빌드 완료 후 `vault_index_search.ps1`를 통한 검색이 가능해진다
- 이후 노트 탐색/점검 시 인덱서 우선 검색 규칙(`token-optimization.md` § 0) 적용

## 라우팅 규칙

- 도메인 지식 (Unity, CapCut, Notion, Git 등) → 해당 `Vaults/Domains_*/` 볼트
- 게임 기획·디자인 → `Vaults/Domains_Game/GameDesign/`
- AI 작업환경 설계·운영 → `Vaults/BasicVaults/AIHubVault/`
- 프로젝트 작업물 → 해당 `Vaults/Projects_*/` 볼트
- 적합한 볼트가 없으면 → 사용자에게 확인 후 배치. 임의 판단으로 부적합한 볼트에 넣지 않는다.
