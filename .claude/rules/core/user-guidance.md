# 유저 가이드 (Mandatory)

> 모든 볼트에 동일 적용. 모든 에이전트 공통.
> 유저가 AIMindVaults 코어 기능 사용 중 막히거나 잘못된 방법을 시도하면, 에이전트가 이 가이드를 참조하여 안내한다.

---

## 트리거 체계

이 가이드는 아래 3가지 유형의 트리거로 발동한다.

### 유형 A: 유저 질문 트리거

유저가 절차/방법을 직접 물어볼 때 발동.

**감지 키워드**: "어떻게", "뭘 해야", "모르겠", "까먹", "방법", "절차", "다음에 뭐", "how to", "what should I"

### 유형 B: 잘못된 시도 감지 트리거

에이전트가 유저의 요청이나 에이전트 자신의 행동이 규칙에 어긋남을 감지했을 때 **선제적으로** 발동.

| 감지 조건 | 해당 섹션 |
|-----------|----------|
| 미등록 볼트에 `obsidian://open?path=` 사용 시도 | §1 |
| `Copy-Item`, `cp`, `xcopy`로 볼트 폴더 복사 시도 | §2 |
| BasicContentsVault에 콘텐츠 작성 시도 | §3 |
| 한 작업에서 Contents 파일과 workspace 파일 동시 수정 시도 | §4 |
| AIHubVault가 아닌 볼트에서 `.sync/` 또는 `.obsidian/` 수정 시도 | §5, §6 |
| 노트 편집 완료 후 post_note_edit_review 미실행 | §8 |
| 인덱서 없이 Grep/Glob으로 전체 볼트 스캔 시도 | §9 |
| `Remove-Item -Recurse`로 깊은 재귀 폴더 삭제 시도 | §10 |
| 사용자 승인 없이 스크립트 생성 시도 | §11 |

### 유형 C: 절차 누락 감지 트리거

필수 단계를 건너뛰었을 때 발동. 에이전트가 작업 흐름 중 자동 감지.

| 감지 조건 | 해당 섹션 |
|-----------|----------|
| 볼트 생성 후 루트 레지스트리 미등록 | §2 |
| 볼트 생성 후 CLAUDE.md 미개별화 | §2 |
| 볼트 생성 후 Obsidian 등록 안내 누락 | §1, §2 |
| 세션 종료 시 _STATUS.md 또는 핸드오프 미갱신 | §7 |
| 노트 편집 후 인덱싱 미완료 (`POST_EDIT_INDEX_UPDATED` 미확인) | §8 |
| workspace 편집 후 `_WORKSPACE_VERSION.md` 미기록 | §5, §6 |
| 코어 규칙 변경 후 `_ROOT_VERSION.md` 미기록 | §12 |

---

## 안내 원칙

- **간결하게**: 해당 상황에 필요한 최소 정보만 전달. 전체 규칙을 읊지 않는다.
- **한 번만**: 같은 세션에서 동일 안내를 반복하지 않는다. 한 번 안내 후 유저가 동의하면 이후 같은 패턴은 자동 처리.
- **차단이 아닌 안내**: 유저의 작업을 멈추지 않는다. 올바른 방법을 알려주고 유저가 선택하게 한다.
- **자기 교정 포함**: 에이전트 자신이 잘못된 방법을 시도하려 할 때도 이 가이드로 자기 교정한다.

---

## 1. 새 볼트를 Obsidian에서 열기

### 트리거
- **B**: 에이전트가 미등록 볼트에 `obsidian://open?path=` 사용하려 할 때
- **A**: "새 볼트 어떻게 열어?", "Obsidian에 등록"

### 안내
> Obsidian 볼트 매니저 → "보관함 폴더 열기" → 볼트 경로 선택

- `obsidian://open?path=` URI로 미등록 볼트를 열면 앱 상태 전환 + 등록 + 플러그인 로드가 동시에 일어나 매우 느리다.
- URI는 **이미 등록된 볼트 전환** (`obsidian://open?vault=볼트명`) 용도로만 사용한다.
- 에이전트도 미등록 볼트에 `obsidian://open?path=`를 사용하지 않는다.

---

## 2. 볼트 생성

### 트리거
- **B**: 수동 폴더 복사로 볼트를 만들려고 할 때
- **A**: "볼트 어디에 만들어?", "볼트 만들고 나서 뭐 해?"
- **C**: 생성 후 레지스트리 등록, CLAUDE.md 개별화, Obsidian 등록 안내 중 하나라도 누락

### 안내
- **생성 방법**: `/create-vault` 스킬 또는 `BasicContentsVault/.sync/clone_vault.ps1` 사용. 수동 복사 금지.
- **위치 선택**: 용도에 맞는 카테고리 안내 (Domains_Game, Domains_Infra, Projects_Game 등)
- **생성 후 필수**: CLAUDE.md 개별화, _STATUS.md 초기화, 루트 레지스트리 등록, Obsidian 등록 (볼트 매니저에서 직접)

---

## 3. 노트는 어느 볼트에 넣어야 하는지

### 트리거
- **A**: "이거 어디에 넣어?", "어떤 볼트?"
- **B**: BasicContentsVault에 콘텐츠 작성 시도

### 안내
- `_STATUS.md` 볼트 레지스트리에서 카테고리별 볼트 목록을 보여준다.
- 키워드로 적합한 볼트를 추천한다 (CLAUDE.md 라우팅 규칙 참조).
- 적합한 볼트가 없으면 새 볼트 생성을 제안한다.
- BasicContentsVault에는 콘텐츠를 넣지 않는다 (클론 템플릿 전용).

---

## 4. 편집 모드 혼동

### 트리거
- **B**: 한 작업에서 Contents 파일과 workspace 파일을 동시 수정하려 할 때
- **A**: "이 파일 수정해도 돼?", "Contents랑 workspace 차이가 뭐야?"

### 안내
- `Contents/**` = Contents 모드. 노트 작성/수정.
- `.sync/`, `.claude/`, 볼트 루트 파일 = Workspace 모드. AIHubVault에서만 수정.
- 한 작업에서 두 모드를 혼합하지 않는다. 모드 전환 시 선언.
- "이 파일은 workspace 편집이라 AIHubVault에서 수정해야 합니다" 식으로 안내.

---

## 5. Workspace 동기화

### 트리거
- **B**: AIHubVault가 아닌 볼트에서 `.sync/` 파일 직접 수정 시도
- **A**: "동기화가 안 됐나?", "버전이 다른데?"
- **C**: workspace 편집 후 `_WORKSPACE_VERSION.md` 미기록

### 안내
- Workspace 편집은 AIHubVault에서만. 다른 볼트는 동기화로 자동 전파.
- `_WORKSPACE_VERSION.md` 버전을 비교하여 차이가 있으면 동기화 수행.
- 동기화 실행: 볼트를 Obsidian에서 열면 자동 실행. 수동: `pre_sync.ps1`.

---

## 6. 플러그인 설치/설정

### 트리거
- **B**: AIHubVault가 아닌 볼트에서 `.obsidian/` 수정 시도
- **A**: "플러그인 설치해줘", "설정 바꿨는데 다른 볼트에 안 먹혀"

### 안내
- 플러그인 설치/설정 변경은 AIHubVault에서 수행 → 동기화로 전파.
- `/install-plugin` 스킬 사용 권장.
- `.obsidian/` 편집은 Workspace 모드. `_WORKSPACE_VERSION.md` 버전 기록 필수.

---

## 7. 세션 종료

### 트리거
- **A**: "끝났어", "정리해", "마무리"
- **C**: 세션 종료 시 _STATUS.md, 핸드오프, 루트 _STATUS.md 중 하나라도 누락

### 안내
- `/vault-update` 스킬로 세션 종료 루틴을 실행하면 자동 처리.
- 수동 시: 볼트 `_STATUS.md` + 루트 `_STATUS.md` + `_SESSION_HANDOFF_{에이전트}.md` 3개 모두 갱신.
- 하나라도 빠지면 세션 종료 불완전.

---

## 8. 노트 작성 후 검증

### 트리거
- **C**: 노트 편집 완료 후 post_note_edit_review 미실행, 또는 인덱싱 미완료
- **A**: "리뷰 어떻게 해?", "BAD가 0이 아닌데?"

### 안내
- 노트 편집 후 `post_note_edit_review.ps1` 실행 필수.
- BAD가 0이 아니면 해당 파일의 문제(frontmatter 누락, 인코딩 등)를 수정.
- 인덱싱(`POST_EDIT_INDEX_UPDATED=1`)까지 확인해야 작업 완료.
- 인덱싱 실패 시 수동: `vault_index_build.ps1 -VaultRoot {볼트경로} -Incremental`

---

## 9. 콘텐츠 검색

### 트리거
- **B**: 인덱서 없이 Grep/Glob으로 전체 볼트 스캔 시도
- **A**: "노트 어디 있어?", "찾고 싶은데"

### 안내
- **인덱서를 먼저 사용**: `vault_index_search.ps1 -Query "검색어"`
- 인덱서 결과가 없을 때만 Grep/Glob 사용.
- 인덱스가 오래된 것 같으면 `/reindex` 실행.

---

## 10. 무한 재귀 경로 삭제

### 트리거
- **B**: `Remove-Item -Recurse`, `rd /s /q`, `7z d` 등으로 깊은 재귀 폴더 삭제 시도
- **A**: "삭제가 안 돼", "경로가 너무 길어"

### 안내
- 상세 해결법: `temp-file-management.md` § "무한 재귀 경로 삭제 (Incident Rule)"
- 1순위: PowerShell flatten-and-delete
- 2순위: robocopy mirror 반복
- 7z, Remove-Item, rd, .NET Delete는 모두 실패한다.

---

## 11. 스크립트 생성

### 트리거
- **B**: 에이전트가 사용자 승인 없이 스크립트 생성 시도
- **C**: Script_Registry.md 중복 확인 누락

### 안내
- 스크립트 생성 전 반드시 사용자 승인. 목적, 경로, 영향 범위 보고.
- `Script_Registry.md`에서 중복 확인. 기존 스크립트 확장으로 해결 가능하면 새로 만들지 않는다.

---

## 12. 배포 동기화

### 트리거
- **A**: "배포 어떻게 해?", "SellingVault가 뭐야?"
- **C**: 코어 규칙 변경 후 `_ROOT_VERSION.md` 미기록

### 안내
- 코어 규칙/스킬 변경은 배포 대상. `_ROOT_VERSION.md`에 기록.
- 배포 경로: SellingVault (`C:\SellingVault\Korean\AIMindVaults`).
- 배포 + git push는 사용자가 명시적으로 요청한 경우에만 수행.
