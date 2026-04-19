---
type: status-hub
updated: 2026-04-08
---

# STATUS HUB — 멀티볼트 레지스트리

> 전체 볼트 목록과 최근 AI 작업 기록.
> 상세 작업 내역은 각 볼트의 `_STATUS.md` 참조.
> 세션 시작 시 최근 작업 날짜 순으로 확인하여 진행 상황 파악.

## 루트 환경

최근 루트 레벨 변경: `_ROOT_VERSION.md` 참조

## 볼트 레지스트리

### BasicVaults

| 볼트 | 타입 | 콘텐츠 | 작업 에이전트 |
|------|------|--------|-------------|
| AIHubVault | Hub | AI 작업환경 설계·개선·배포 원본 | - |
| BasicContentsVault | Template | 볼트 복제 템플릿 (직접 편집 금지) | - |

> 볼트를 추가하면 이 레지스트리에 등록한다.
> 볼트 생성: `/create-vault` 스킬 또는 `BasicContentsVault/.sync/clone_vault.ps1` 사용.

### 확장 예시

새 주제가 생기면 용도에 맞는 카테고리 폴더 아래에 볼트를 추가한다:

| 카테고리 | 경로 패턴 | 용도 |
|---------|----------|------|
| Domain | `Vaults/Domains_<영역>/<볼트명>/` | 특정 주제의 지식 축적 |
| Lab | `Vaults/Lab_<영역>/<볼트명>/` | 지식 축적 + 실제 개발 복합 |
| Project | `Vaults/Projects_<영역>/<볼트명>/` | 프로젝트 실행 전용 |
| Personal | `Vaults/Personal/<볼트명>/` | 개인 기록 |
| Reference | `References/<볼트명>/` | 외부 자료 조회 (읽기 전용) |
