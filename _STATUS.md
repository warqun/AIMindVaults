---
type: status-hub
updated: 2026-04-22
last_session: claude / 2026-04-22 긴세션 (R075 create-preset-hub · R076 런처 단일 copy + defaultTemplate · R077 BasicXxxVault 4종 병렬 · R078 Project_MyVaults 신설 + 분리원칙 + 27위성 Preset 검수 보고서) · codex / 2026-04-22 (AI Claude Design 애니메이션·비디오 핸드오프 노트 + Claude Code 총정리 노트 + Claude Code/OpenClaw 에이전트 운영 사례 노트)
---

# STATUS HUB — 멀티볼트 레지스트리

> 전체 볼트 목록과 최근 AI 작업 기록.
> 상세 작업 내역은 각 볼트의 `_STATUS.md` 참조.
> 세션 시작 시 최근 작업 날짜 순으로 확인하여 진행 상황 파악.

## 루트 환경

최근 루트 레벨 변경: `_ROOT_VERSION.md` 참조

## 볼트 레지스트리

### BasicVaults

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| CoreHub | Core Hub | `Vaults/BasicVaults/CoreHub/` | **Core 계층 정본** (CLI, _Standards/Core, schemas, Core 6 플러그인). Multi-Hub Phase 1 (2026-04-20). `core-sync-all --broadcast` 로 모든 Preset Hub 에 Push. hubType=core, hubId=core | claude / 2026-04-20 |
| AIHubVault | Preset Hub (default) | `Vaults/BasicVaults/AIHubVault/` | **Default Preset Hub** (hubId=default). Core 계층 수신 + Custom 번들 (Juggl, make-md, obsidian-git, mcp-tools, 기타 Custom A) 관리. 27 위성 바인딩. AI 작업환경 설계·개선·배포 원본 | codex / 2026-04-21 |
| AIHubVault_Minimal | Preset Hub (minimal) | `Vaults/BasicVaults/AIHubVault_Minimal/` | Minimal Preset Hub (hubId=minimal). Core 6 플러그인만 · Custom 없음. 위성 바인딩 없음 (옵션) | claude / 2026-04-20 |
| BasicContentsVault | Template | `Vaults/BasicVaults/BasicContentsVault/` | 범용 볼트 템플릿. `/create-vault` 스킬의 clone 소스 — 직접 콘텐츠 작업 금지. Hub 아님 | - |

### Domains

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| Unity | Domain | `Vaults/Domains_Game/Unity/` | Unity 엔진 도메인 지식 | claude / 2026-04-13 |
| GameDesign | Domain | `Vaults/Domains_Game/GameDesign/` | 게임 기획·디자인 도메인 지식 | codex / 2026-04-13 |
| CapCut | Domain | `Vaults/Domains_Video/CapCut/` | CapCut 영상편집 도메인 지식 | - |
| Notion | Domain | `Vaults/Domains_Infra/Notion/` | Notion 워크스페이스 운영 도메인 지식 | claude / 2026-03-18 |
| Git | Domain | `Vaults/Domains_VCS/Git/` | Git 버전 관리 도메인 지식 | - |
| Blender | Domain | `Vaults/Domains_3D/Blender/` | Blender 3D 모델링 도메인 지식 | claude / 2026-04-07 |
| AI_Gen4Game | Domain | `Vaults/Domains_AI_Asset/AI_Gen4Game/` | AI 활용 게임 에셋 제작 — Meshy API 연동 완료, Tripo·Meshy 게임 현업 활용성 비교 노트 추가 | codex / 2026-04-19 |
| GameArt | Domain | `Vaults/Domains_Game/GameArt/` | 게임 아트/비주얼 프로덕션 기법 | claude / 2026-04-04 |
| CICD | Domain | `Vaults/Domains_Infra/CICD/` | CI/CD 및 배포 동기화 도메인 지식 | claude / 2026-03-21 |
| Search | Domain | `Vaults/Domains_Infra/Search/` | 검색 엔진, 인덱싱, 텍스트 매칭 도메인 지식 | claude / 2026-03-21 |
| AI | Domain | `Vaults/Domains_Infra/AI/` | AI 활용 기술 도메인 지식 (에이전트, 프롬프트, 도구 가이드) | codex / 2026-04-22 |
| AppFlowy | Domain | `Vaults/Domains_Infra/AppFlowy/` | AppFlowy 셀프호스트 설치·운영·이관 도메인 지식 | claude / 2026-03-23 |
| Discord | Domain | `Vaults/Domains_Infra/Discord/` | Discord 서버 운영, 채널 구조, 봇·자동화·모더레이션 도메인 지식 | claude / 2026-04-17 |

### Labs

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| ObsidianDev | Lab | `Vaults/Lab_Infra/ObsidianDev/` | Obsidian 플러그인 개발 (지식 + 개발) | claude / 2026-04-13 |

### Domain_Art (아트 도메인)

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| LightAndColor | Domain | `Vaults/Domain_Art/LightAndColor/` | 빛과 색 이론, 시지각 기초, 색채학 입문 가이드, 색감/톤 용어 사전, 색감 스타일/무드 가이드, 감정 설계, 색보정/명암 설계, 영화 색 스토리텔링, 필름 미학 도메인 지식 | codex / 2026-04-13 |
| ArtInsight | Domain | `Vaults/Domain_Art/ArtInsight/` | 미적 안목, 시각적 분별, 레퍼런스 해석, 취향과 스타일 판단 도메인 지식 | codex / 2026-04-08 |

### Domains_Business

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| Funding | Domain | `Vaults/Domains_Business/Funding/` | 크라우드 펀딩, 수익 모델, 자금 조달 전략 도메인 지식 | claude / 2026-04-08 |

### Lab_Game (게임 개발 도구 — Lab)

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| CombatToolKit | Lab | `Vaults/Lab_Game/CombatToolKit/` | 게임 전투 시스템 개발 툴킷 — CombatTestBed Phase A~B 완료, 전투 풀 파이프라인 작동 확인, Phase C~E 잔여 | claude / 2026-04-04 |
| TileMapToolKit | Lab | `Vaults/Lab_Game/TileMapToolKit/` | 게임 타일맵 시스템 개발 툴킷 — Edge v2 26규칙 완성 (SameOnly 도입), 텍스처 방향·설정 수정 완료. 다음: Phase 2 복합 브러시 | claude / 2026-04-08 |

### Projects_Game (게임 개발 프로젝트)

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| JissouGame | Project | `Vaults/Projects_Game/JissouGame/` | Unity 기반 게임 개발 프로젝트 — 전투판정·잡기/포식 체인, 코어 시스템(시간/카메라/맵) 스텁, 성장 크기비 1:4:9:36, Fake 2D 방향 확정. 다음: 맵 기술 검토, 구현 진입 | claude / 2026-04-06 |

### Projects_Infra (AIMindVaults 제품 개발)

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| Project_AIMindVaults | Project | `Vaults/Projects_Infra/Project_AIMindVaults/` | AIMindVaults 멀티볼트 시스템 프로젝트 — **Step 3 BasicXxxVault 4종 완료 (R077, 2026-04-22)**: Diary/Domain/Lab/Project 전용 클론 템플릿 병렬 구축 (4 Agent run_in_background) · 6 Preset Hub × defaultTemplate 전수 정상 해석. **BasicVaults 런처 재배치 (R076)**: 단일 copy + defaultTemplate 메커니즘 + 41 깨진 파일 청소. **Preset Hub 생성 스킬 (R075)**: /create-preset-hub + create-hub.js 주석. **Multi-Hub Phase 1.5 (2026-04-21)**: Core 7 + 자동 병합 + plugin-seed + systemName 정합. 다음: **Step 3 deferred 항목 8건 사용자 판단** + 배포 R074~R077 + hook 테스트 + Obsidian Shell Commands 감사 + OpenClaw 에이전트 세팅 (다음 세션) | claude / 2026-04-22 |

### Domains_Dev (개발 언어/스타일)

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| Python | Domain | `Vaults/Domains_Dev/Python/` | Python 6단계 학습 로드맵 완성 (기초→과학계산→고급), 시뮬레이션 R&D 맥락 | claude / 2026-04-08 |
| AI_Coding | Domain | `Vaults/Domains_Dev/AI_Coding/` | AI 코딩 활용 가이드 4개 노트 완성, 클린 코드 양면성 반영 | claude / 2026-04-08 |
| JavaScript | Domain | `Vaults/Domains_Dev/JavaScript/` | JavaScript 언어, Node.js 런타임, npm 생태계, CLI 도구 개발 | claude / 2026-04-13 |

### Domains_Life (라이프 도메인)

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| Cooking | Domain | `Vaults/Domains_Life/Cooking/` | 요리 전문 지식 (조리과학, 식재료, 기법, 식문화) | claude / 2026-04-10 |

### Lab_Content (콘텐츠 제작 Lab)

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| CookingLab | Lab | `Vaults/Lab_Content/CookingLab/` | 요리철학 연구, 레시피 분석, 채널 준비 | claude / 2026-04-10 |

### Personal

| 볼트 | 타입 | 경로 | 콘텐츠 | 작업 에이전트 |
|------|------|------|--------|-------------|
| Diary | Personal | `Vaults/Personal/Diary/` | 개인 다이어리, 회고, 성장 로그 | claude / 2026-03-21 |

### References

| 볼트 | 타입 | 경로 | 콘텐츠 | 비고 |
|------|------|------|--------|------|
| Unity_Documentation | Reference | `References/Unity_Documentation/` | Unity 6.3 공식 매뉴얼·스크립트 API | readonly |
