# Rules 매니페스트

> 배포 동기화 시 이 목록의 파일만 `core/`에서 관리한다.
> `custom/`은 동기화 대상이 아니다.

## 분류 기준

- **core/**: 배포본에 포함되는 규칙. 모든 사용자에게 필요한 제품 기능. 상시 주입 대상.
- **custom/**: 배포에 포함되지 않는 개인 규칙. 제작자·사용자 모두 해당.
- **rules-archive/**: 자동 주입 제외 (Phase 0 PoC 검증 완료 2026-04-18). Skill Router 또는 수동 Read로 로드.
- **신규 규칙은 custom/에 우선 생성**한다. 검증 후 필요하면 core/로 격상.
- core/로 격상 시 이 MANIFEST에 등록 + 배포 변경 로그에 기록.

## core/ — 배포 규칙 (동기화 대상, 상시 주입)

> Phase 1 (2026-04-18): 7개 규칙을 `_essentials.md`로 통합하고 원본은 `rules-archive/`로 이동. Skill Router 신설.

| 파일명 | 용도 |
|--------|------|
| `_essentials.md` | 필수 코어 — 보고 언어, 토큰 절약, 볼트 라우팅, 편집 모드, Post-Edit Review, 노트 작성 frontmatter/H1/파일명, 세션 종료 통합 |
| `_skill-router.md` | 작업 키워드 → 로드할 규칙 파일 경로 매핑 테이블 |
| `distribution-content-safety.md` | 배포 대상 문서에 사용자 개인 볼트명·카테고리·자산 인용 금지 (2026-04-25 incident 기반) |
| `distribution-sync.md` | 배포 동기화 규칙 |
| `encoding-safety.md` | 인코딩 안전 |
| `juggl-style-sync.md` | Juggl 스타일 동기화 |
| `obsidian-config-safety.md` | Obsidian 설정 파일 안전 편집 |
| `script-creation-approval.md` | 스크립트 생성 사전 승인 |
| `script-management.md` | 스크립트 관리 |
| `shell-redirect-safety.md` | 셸별 NUL 리다이렉트 구문 안전 (Bash `2>/dev/null` · PowerShell `2>$null` · CMD `2>nul` 구분) |
| `temp-file-management.md` | 임시 파일 관리 |
| `user-guidance.md` | 유저 가이드 (D안 슬림판: 고위험 6섹션 인라인 유지, 저위험은 Skill Router 위임) |
| `vault-individualization.md` | 볼트 개별화 규칙 (생성 시 필수 결정 항목 + 후속 작업 5단계 — workspace 동기화 / 루트 레지스트리 등록 / CLAUDE.md 키워드 / 초기 인덱스 빌드 / obsidian.json 자동 등록. R160 으로 custom/CreateVault → core/ 격상) |
| `viz-device-sync.md` | viz 디바이스 간 동기화 워크플로우 (R146/R149 자동 동기화, R141 viz_snapshots, R148 KPI 노트 기반 derive, _AGENT_COMMS 큐 패턴) |

## custom/ — 사용자 규칙 (동기화 미대상)

사용자가 자유롭게 추가하는 개인 규칙.
배포 동기화가 이 폴더를 건드리지 않는다.

| 파일명 | 용도 |
|--------|------|
| `multivault-personalization.md` | 멀티볼트 개인화 (에이전트/플러그인/스킬 커스텀) |
| `agent-ownership.md` | 에이전트 소유권 분리 (Claude/Codex 동시 수정 방지) |

> Phase 2-A (2026-04-18): 도메인 규칙들을 `rules-archive/` 로 이관하고 도메인별 Skill 로 전환. 구체 도메인은 사용자 환경에 따라 다름 — 본 매니페스트는 일반 인프라 룰만 등록.

## rules-archive/ — 자동 주입 제외 (트리거 시 수동 Read)

> Phase 0 PoC 검증 완료 (2026-04-18). `.claude/rules-archive/` 하위는 세션 시작 시 자동 주입에서 제외됨.
> Skill Router(`core/_skill-router.md`)가 트리거 키워드 감지 시 해당 파일을 Read 지시.

### Phase 1 흡수 후 원본 (2026-04-18 이동)

`_essentials.md`에 핵심만 통합됨. 세부 규정·배경·Incident Rule 원본 참조용.

| 파일명 | 트리거 조건 | 이전 위치 |
|--------|-----------|---------|
| `token-optimization.md` | 토큰 절약 세부 기준·fallback 조건 확인 | core/ |
| `session-exit.md` | 세션 종료 세부 절차·핸드오프 템플릿 확인 | core/ |
| `note-writing.md` | 노트 타입 목록·태그 규칙·H1/파일명 예시 확인 | core/ |
| `vault-routing.md` | 볼트 라우팅 상세 규칙 확인 | core/ |
| `post-edit-review.md` | Post-Edit Review 세부 명령 확인 | core/ |
| `edit-mode-separation.md` | 편집 모드 세부 규칙·AIHubVault 전용 워크플로 확인 | core/ |
| `report-language.md` | 보고 언어 원문 | custom/ |

### Phase 0 PoC (2026-04-18 이동)

| 파일명 | 트리거 조건 | 이전 위치 |
|--------|-----------|---------|
| `meshy-api.md` | Meshy API, 3D 모델 생성, AI 텍스처 작업 | custom/ |

### Phase 2-B: user-guidance 분할 (2026-04-18 D안)

| 파일명 | 트리거 조건 | 설명 |
|--------|-----------|---------|
| `user-guidance-detail.md` | 저위험 섹션(§1, §3, §6, §7, §9, §12) 트리거, 유저 질문 | 원본 12개 섹션 전체. core/user-guidance.md는 고위험 6섹션만 슬림 유지 |

### Phase 2-A: 도메인 Skill 전환 (2026-04-18)

도메인 규칙들을 Skill 로 통합. Skill 호출 시 해당 archive 파일 Read 지시. 도메인별 트리거 매핑은 `.claude/rules/core/_skill-router.md` 참조 (사용자 환경에 따라 활성·비활성 도메인 다름).

배포 운영 관련 일반 인프라 archive:

| 파일명 | 트리거 조건 | Skill |
|--------|-----------|-------|
| `distribution-deploy.md` | 배포, SellingVault, git push | `/distribute` |
| `sync-version-priority.md` | cli.js sync, pre-sync, _WORKSPACE_VERSION | `/distribute` |

### Phase 3: 참조 문서 이관 (2026-04-18, R160 으로 비움)

자주 쓰이지 않는 참조성 규칙을 archive로 이관하고 Skill 호출 시 Read.

- `vault-individualization.md` 는 R125 (2026-05-18) 로 `.agents/rules/custom/CreateVault/` 이동 후, **R160 (2026-06-06) 으로 `.agents/rules/core/` 격상** — 모든 사용자 대상 일반 인프라로 상시 주입. core/ 표 참조.

### Phase 2-A bulk-edit-safe 최종 결론 (2026-04-18)

`encoding-safety.md`, `temp-file-management.md`는 **core 유지**. 평시 대량 편집·CLI 실행 전반에 상시 필요하며, Skill 트리거 방식으로는 자기교정 지연 리스크(§10 무한 재귀 incident 등). `bulk-edit-safe` Skill 생성하지 않음.
