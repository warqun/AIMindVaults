# 유저 가이드 — 고위험 자기교정 (Mandatory · 상시 주입)

> 에이전트가 유저의 코어 기능 사용 중 **잘못된 시도·절차 누락을 감지했을 때 즉시 차단**해야 하는 고위험 섹션만 인라인 유지.
> 저위험 트리거 및 상세 안내는 `_skill-router.md` 경유로 `.claude/rules-archive/user-guidance-detail.md` Read.

## 공통 원칙

- **감지 즉시 차단**: 고위험 트리거는 위반 감지 순간 작업 멈추고 안내.
- **차단이 아닌 안내**: 올바른 방법 제시 후 유저가 선택하게 한다.
- **한 번만**: 같은 세션에서 동일 안내 반복 금지.
- **자기 교정**: 에이전트 자신의 잘못된 시도에도 동일 적용.

## 고위험 트리거 (인라인 즉시 차단)

### §2 볼트 생성 — 수동 복사 시도

**감지**: `Copy-Item`, `cp`, `xcopy`, `robocopy`로 볼트 폴더 복사 시도.

**즉시 안내**:
> `/create-vault` 스킬 또는 `node cli.js clone` 사용. 수동 복사 시 `.git`/캐시/디바이스별 플러그인 설정이 오염되고 make-md systemName 충돌 발생.

**후속 필수 (누락 감지 시에도 차단)**:
- 루트 `_STATUS.md` 레지스트리 등록
- CLAUDE.md 개별화 (역할, 수집 범위, 태그 규칙)
- Obsidian 볼트 매니저에서 직접 등록

상세: `rules-archive/user-guidance-detail.md § 2` + `rules-archive/vault-individualization.md`

### §4 편집 모드 혼동

**감지**: 한 작업에서 `Contents/**` 파일과 workspace 파일(`.sync/`, `.claude/`, `.obsidian/`, 볼트 루트)을 동시 수정 시도.

**즉시 안내**:
> 한 작업은 `[Contents]` 또는 `[workspace]` 중 하나만. workspace 편집은 AIHubVault에서만 수행됨. 모드 전환 시 선언.

상세: `_essentials.md § 4`

### §5 workspace 동기화 — 버전 기록 누락 (2026-03-21 incident)

**감지**:
- AIHubVault 외 볼트에서 `.sync/` / `.obsidian/` 직접 수정
- workspace 편집 직후 `_WORKSPACE_VERSION.md` 미기록 상태로 후속 작업 진행

**즉시 안내**: workspace는 AIHubVault 전용 · 편집 직후 `_WORKSPACE_VERSION.md` 기록 전 후속 작업 금지.

상세: `_essentials.md § 4` + `rules-archive/sync-version-priority.md`

### §8 편집 후 검증 — BAD/INDEX 미확인 (2026-04-13 incident)

**감지**: `node cli.js review` 미실행 / `POST_EDIT_REVIEW_BAD=0` · `POST_EDIT_INDEX_UPDATED=1` 미확인 상태에서 완료 보고.

**즉시 안내**: 노트 편집은 review 통과 + 인덱싱 완료까지가 끝. 절차·명령은 `_essentials.md § 5` 참조.

### §10 무한 재귀 경로 삭제

**감지**: `Remove-Item -Recurse`, `rd /s /q`, `7z d`, `[System.IO.Directory]::Delete()`로 깊은 재귀 폴더 삭제 시도.

**즉시 안내**:
> Windows MAX_PATH(260자) 한계로 위 도구 모두 실패. 1순위 PowerShell flatten-and-delete, 2순위 robocopy mirror 반복 사용.

상세: `core/temp-file-management.md § 무한 재귀 경로 삭제 (Incident Rule)`

### §11 스크립트 생성 — 사전 승인 누락

**감지**: 에이전트가 사용자 승인 없이 `.ps1`/`.py`/`.bat`/`.sh` 생성 또는 실행 시도.

**즉시 안내**:
> 생성 전 사용자 보고 필수: 1) 목적, 2) 경로, 3) 영향 범위, 4) 일회성/영구. 보고 + 승인 없이 생성 금지. `Script_Registry.md` 중복 확인 병행.

상세: `core/script-creation-approval.md` + `core/script-management.md`

## 저위험 트리거 → Skill Router 위임

다음은 `_skill-router.md`의 "유저 가이드" 행이 처리 → `rules-archive/user-guidance-detail.md` Read:

- §1 새 볼트 Obsidian 열기 (URI vs 볼트 매니저)
- §3 노트 라우팅 (어느 볼트에 넣어야 하는지)
- §6 플러그인 설치/설정
- §7 세션 종료 루틴
- §9 콘텐츠 검색 (인덱서 우선 — `_essentials.md § 2`에 요약 있음)
- §12 배포 동기화 (SellingVault, git push)

## 참조

- 전체 12개 섹션 상세: `.claude/rules-archive/user-guidance-detail.md`
- 유형 A/B/C 트리거 체계 원본: 같은 archive 파일 상단
