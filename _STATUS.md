---
type: status-hub
updated: 2026-05-26
last_session: -
---

# STATUS HUB — 멀티볼트 레지스트리

> 전체 볼트 목록과 최근 AI 작업 기록.
> 상세 작업 내역은 각 볼트의 `_STATUS.md` 참조.
> 세션 시작 시 최근 작업 날짜 순으로 확인하여 진행 상황 파악.

## 루트 환경

최근 루트 레벨 변경: `_ROOT_VERSION.md` 참조

## 볼트 레지스트리

### BasicVaults (시스템 제공)

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| CoreHub | Core Hub | `Vaults/BasicVaults/CoreHub/` | **Core 계층 정본** (CLI, `_Standards/Core`, schemas, Core 6 플러그인). `core-sync-all --broadcast` 로 모든 Preset Hub 에 Push. hubType=core, hubId=core | - |
| AIHubVault | Preset Hub (default) | `Vaults/BasicVaults/AIHubVault/` | **Default Preset Hub** (hubId=default). Core 계층 수신 + Custom 번들 관리. 사용자가 추가하는 위성 볼트 바인딩 | - |
| AIHubVault_Minimal | Preset Hub (minimal) | `Vaults/BasicVaults/AIHubVault_Minimal/` | Minimal Preset Hub (hubId=minimal). Core 6 플러그인만 · Custom 없음 | - |
| AIHubVault_Domain | Preset Hub (domain) | `Vaults/BasicVaults/AIHubVault_Domain/` | Domain Preset Hub (hubId=domain). 도메인 볼트용 ZK 시스템 | - |
| AIHubVault_Lab | Preset Hub (lab) | `Vaults/BasicVaults/AIHubVault_Lab/` | Lab Preset Hub (hubId=lab). 지식 + 개발 복합 볼트용 | - |
| AIHubVault_Project | Preset Hub (project) | `Vaults/BasicVaults/AIHubVault_Project/` | Project Preset Hub (hubId=project). 프로젝트 작업 볼트용 | - |
| AIHubVault_Diary | Preset Hub (diary) | `Vaults/BasicVaults/AIHubVault_Diary/` | Diary Preset Hub (hubId=diary). 개인 다이어리·회고용 | - |
| BasicContentsVault | Template | `Vaults/BasicVaults/BasicContentsVault/` | 범용 볼트 템플릿. `/create-vault` 스킬의 clone 소스 — 직접 콘텐츠 작업 금지. Hub 아님 | - |
| BasicDomainVault | Template | `Vaults/BasicVaults/BasicDomainVault/` | Domain 전용 클론 템플릿 (ZK 5타입 구조) | - |
| BasicLabVault | Template | `Vaults/BasicVaults/BasicLabVault/` | Lab 전용 클론 템플릿 (Domain + Project 복합) | - |
| BasicProjectVault | Template | `Vaults/BasicVaults/BasicProjectVault/` | Project 전용 클론 템플릿 | - |
| BasicDiaryVault | Template | `Vaults/BasicVaults/BasicDiaryVault/` | Diary 전용 클론 템플릿 (ai_scope=none 권장) | - |

### 사용자 추가 볼트

사용자가 `/create-vault` 또는 `/create-preset-hub` 스킬로 추가하는 볼트는 이 레지스트리에 행을 추가한다.

권장 카테고리 패턴 (사용자 자유 명명):

- `Domains_*` (지식 축적 — Domain 타입): 사용자 관심 도메인별로 그룹화
- `Lab_*` (지식 + 개발 복합 — Lab 타입): 학습과 동시에 만드는 작업
- `Projects_*` (실전 프로젝트 — Project 타입): 목표 달성 중심 작업
- `Personal/` (개인 기록 — Personal 타입): 다이어리·회고 등 (ai_scope=none 권장)
- `References/` (외부 readonly 자료 — Reference 타입): 공식 매뉴얼·외부 데이터

상세 분류 기준은 `_Standards/Core/VaultTypes/VaultTypes.md` 참조.

테이블 양식:

```markdown
### Domains_<사용자 영역명>

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| <볼트명> | Domain | `Vaults/Domains_<영역>/<볼트명>/` | <콘텐츠 한 줄 설명> | <에이전트명> / <YYYY-MM-DD> |
```
