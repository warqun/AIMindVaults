---
description: "에이전트 협업 위임 워크플로우 — 큐 작성 + spawn + 트리거 + 추적"
---

# /delegate-task — 에이전트 작업 위임 (큐 + spawn 통합)

## 용도

광범위·1세션 초과·메모리 분리가 필요한 작업을 **콜드 스타트 큐**로 작성 + **별도 Claude CLI 인스턴스**에 위임. 본 세션 (오케스트레이터) 은 다른 작업 계속 + 결과만 수집.

오케스트레이터-워커 패턴의 표준 SOP. `/spawn-claude` 가 spawn 메커니즘이라면, 본 스킬은 **위임 워크플로우 전체** (큐 작성 → spawn → 트리거 → 추적 → 완료 처리).

## 트리거 키워드

- "위임", "떠넘겨", "백그라운드로", "별도 인스턴스로"
- "워커", "delegate", "병렬 작업", "동시 작업"
- "다른 클로드", "다른 에이전트가", "큐로 던져"
- "긴 작업이라 따로", "이건 다른 세션에서"

## 위임이 적합한 작업 유형

| 유형 | 예시 |
|------|------|
| **광범위 점검·정리** | 영문 배포본 한글 잔존 일괄 영문화, Funding 본체 잔재 재귀 폴더 cleanup |
| **1세션 초과 분량** | BasicXxxVault 4종 병렬 생성, 27 위성 전수 검수 |
| **메모리 격리 필요** | 본 세션 컨텍스트와 무관한 도메인 작업 (Cooking 인덱스 재빌드 등) |
| **반복 작업** | frontmatter 일괄 갱신, 태그 정리, 링크 재정렬 |
| **장시간 모니터링** | 대량 sync 검증, 인덱스 빌드 진행 추적 |

**위임이 부적합**: 본 세션 메모리·맥락에 강하게 묶인 작업, 짧은 단발 수정, 사용자 즉시 결정 대기 작업.

## 5단계 워크플로우

### 1. 큐 작성 (`_AGENT_COMMS/to_claude/`)

**파일명 규약**: `{YYYYMMDD}_Claude_Claude_<주제>.md`
- 한글·영문 OK, 단 파일명 URI 예약문자 금지 (`#`, `%`, `&`, `?`, `+`)

**Frontmatter (필수)**:
```yaml
---
type: agent-comm
tags:
  - agent-comm
  - delegated
  - <주제 키워드>
from: claude (오케스트레이터, <세션 식별>)
to: claude (워커 — <역할 설명>)
status: open
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

**본문 — 콜드 스타트 자기완결성 (필수)**:
- **배경**: 위임 사유, 본 세션 (오케스트레이터) 정보
- **영향 범위**: 대상 경로, 파일 수, 추정 분량
- **작업 절차 (Phase 분할)**: 단계별 명령·기준·산출물
- **주의 사항**: 동시 수정 금지 영역, 룰 정합 (agent-ownership / distribution-sync 등), 분량 초과 처리법
- **완료 처리**: status 갱신, 응답 섹션, 완료 트리거 파일 명세
- **참조**: 관련 큐·스킬·룰·핸드오프 경로

워커는 **본 세션 메모리 공유 X** — 큐 본문만으로 실행 가능해야 함.

### 2. spawn (`/spawn-claude` 활용)

**방식 1: 명시 트리거 (즉시 작업 시작)**
```bash
/spawn-claude "_AGENT_COMMS/to_claude/<큐파일>.md 처리해줘"
```

**방식 2: 빈 세션 (사용자 직접 입력)**
```bash
/spawn-claude
```
새 인스턴스 열림 → 사용자 키보드 입력.

**방식 3: 자연어 트리거 (큐 자동 발견)**
```bash
/spawn-claude "<주제 자연어 표현>"
```
워커가 진입 프로토콜 (`_AGENT_COMMS/to_claude/` 스캔) 으로 큐 자동 발견.

**병렬 다중 spawn**:
```bash
/spawn-claude "큐1 처리"
/spawn-claude "큐2 처리"
/spawn-claude "큐3 처리"
```
각자 독립 메모리 — 충돌 없는 작업으로 분리 (동시 수정 금지 영역 회피).

### 3. 트리거 메시지 패턴

**명시** (가장 안전):
```
_AGENT_COMMS/to_claude/<파일명>.md 큐 본문 따라 진행
```

**포괄**:
```
_AGENT_COMMS/to_claude 스캔하고 open 큐 처리
```

**자연어**:
```
<주제> 작업 시작
영문 배포본 점검 진행
도메인 볼트 인덱스 재빌드
```

### 4. 추적

**워커 상태 갱신**:
- `open → in-progress → resolved`
- 진행 중간 결과는 큐 파일 본문 하단 **응답 섹션** 누적
- 큰 작업은 Phase 별로 status 업데이트 권장

**오케스트레이터 추적**:
- 별도 인스턴스 ↔ 본 세션 메모리 공유 X
- 진행 상황 확인은 큐 파일 직접 Read (`status:` 필드 + 응답 섹션)
- `_AGENT_COMMS/to_claude/` 의 frontmatter 일괄 확인 (R087 룰)

### 5. 완료 처리

**워커 완료 시**:
1. 큐 파일 status `in-progress → resolved`
2. 응답 섹션에 작업 요약 (파일 수, 명령 결과, commit 해시 등)
3. **완료 트리거 파일 생성**: `_AGENT_COMMS/to_claude/{YYYYMMDD}_Claude_Claude_<주제>_완료.md`
4. 워커 세션 핸드오프 작성

**오케스트레이터 후속**:
- 다음 세션 (또는 같은 세션) 진입 시 `_AGENT_COMMS/to_claude/` 스캔에서 완료 트리거 파일 자동 발견
- 사용자 명시 후속 작업 (R 번호 ✅ 갱신, push, 통합 보고 등) 진행
- 트리거 체인 규약: `_AGENT_COMMS/README.md § 완료 트리거 체인` 참조

## 주의 사항

### 동시 수정 금지 영역 (agent-ownership.md § "동시 수정 금지")

다음 파일은 **한 에이전트만** 수정. 위임 시 워커가 같은 파일 건드리지 않도록 큐 본문에 명시:

| 파일 | 사유 |
|------|------|
| 루트 `_STATUS.md` | 상태 추적 단일 소스 |
| 볼트별 `_STATUS.md` | 동일 |
| `_WORKSPACE_VERSION.md` | 버전 번호 충돌 |
| `_ROOT_VERSION.md` | R 번호 충돌 |
| `.obsidian/**` | JSON 병합 불가 |
| `_VAULT-INDEX.md` | 구조 깨짐 |

본 세션 (오케스트레이터) 이 이미 갱신했고 워커가 추가 갱신 필요하면 컬럼 단위 분리 (예: 본 세션 = Korean 컬럼, 워커 = English 컬럼).

### 콜드 스타트 자기완결성

큐 본문에 다음이 빠지면 워커가 막힘:
- 대상 경로 (절대 경로 권장)
- 명령 예시 (Bash/PowerShell 구분)
- Phase 별 산출물 기준
- 룰 정합 (어떤 룰 위반 위험, 어떻게 회피)
- 본 세션 진행 상황 (어디까지 했는지)

### 1세션 초과 처리

워커 1 세션 분량 초과 시:
- 워커가 자기 발신 셀프 메모 작성 (`from: claude → to: claude`)
- 다음 워커 세션이 이어작업 트리거로 발견
- 또는 오케스트레이터에게 진행 보고 후 다음 작업 결정

### 룰 정합

위임 시 다음 룰 자동 준수 안 됨 — 큐 본문에 명시 필요:
- `distribution-sync.md` — Claude 가 SellingVault 직접 접근 시 사용자 명시 트리거 강제
- `script-creation-approval.md` — 워커가 `.ps1`/`.py`/`.bat` 생성 시 사용자 승인
- `agent-ownership.md § _AGENT_COMMS` — frontmatter 일괄 확인 + 큐 트리거 분류 SOP

## 검증 표준 (강제)

위임 큐 본문 + 완료 트리거 본문에 다음 두 섹션을 강제로 포함해 워커 보고서 신뢰성을 높이고 메인 spot-check 만으로 검증을 종료한다.

### 1. Phase 4 검증 형식 강제 (위임 큐 본문)

위임 큐 본문의 `## 작업 명세` 또는 별도 `## Phase 4 검증` 섹션에 다음 형식 강제:

```markdown
### Phase 4 검증

**검증 명령** (워커가 작업 후 직접 실행):
- 명령 1: `<bash 명령>` → 기대값: <PASS/FAIL 마커>
- 명령 2: `<bash 명령>` → 기대값: <PASS/FAIL 마커>

**raw output 보고**: 검증 명령 실행 결과 raw 텍스트를 완료 트리거 파일의 § 검증 결과 섹션에 그대로 포함.
```

### 2. Phase 5 — 메인 spot-check 권장 명령 강제 (완료 트리거 본문)

완료 트리거 파일 끝에 다음 섹션 강제:

````markdown
## 메인 spot-check 권장

다음 1줄 명령으로 메인이 빠르게 검증 가능:

```bash
<spot-check 명령 1>  # 기대값
<spot-check 명령 2>  # 기대값
```
````

### 효과

- 워커 보고서 신뢰성 향상 → 메인이 보고서 + 1줄 spot-check 만으로 검증 종료
- 토큰 60~70% 절약 (4× 직접 검증 → 1× spot-check)

### 강제 적용 범위

- 위임 큐 신규 작성 시 항상 포함 (Phase 4 검증 + 완료 트리거 spot-check 가이드 함께 명시)
- 기존 위임 SOP (5 단계 워크플로우) 와 병행 — 본 표준은 추가 강제이며 기존 워크플로우 대체 X

## 사용 예시

### 예시 1: 영문 배포본 한글 잔존 점검 (4-29)

**오케스트레이터 작업**:
1. 큐 작성: `_AGENT_COMMS/to_claude/20260429_Claude_Claude_English_배포본_한글_잔존_점검.md`
   - 6 Phase (스캔 → 분류 → 영문화 → 동등성 → deploy/commit/push → R 번호 ✅)
   - 본문에 큐 작성 시점 정보 (Korean 배포 commit 해시) + 룰 정합
2. spawn:
   ```
   /spawn-claude "_AGENT_COMMS/to_claude/20260429_*.md 큐 본문 따라 6 Phase 진행해줘"
   ```
3. 본 세션은 다른 작업 계속

**워커 자율 진행**:
1. 진입 프로토콜 → 큐 발견
2. 트리거 메시지 받아서 Phase 1 시작
3. 분량 초과 가능 → 자기 셀프 메모 트리거 가능

### 예시 2: 잔재 폴더 정리 (Funding 4-27 케이스)

**오케스트레이터 작업**:
1. 큐 작성: 폴더 경로 + `temp-file-management.md § 무한 재귀 경로 삭제` 절차 명시
2. spawn 인자로 큐 경로 + "destructive 삭제 사용자 명시 승인 받아 진행" 환기

**워커**:
- 사용자에게 영향 범위 보고 후 명시 승인 받고 삭제

### 예시 3: 도메인 볼트 인덱스 재빌드 (대량)

**병렬 spawn**:
```
/spawn-claude "Cooking 볼트 index build -i"
/spawn-claude "MachineAssembly 볼트 index build -i"
/spawn-claude "Discord 볼트 index build -i"
```

각 워커 독립 작업 → 본 세션은 master-index-build 만 처리.

## 관련 스킬·룰

- `/spawn-claude` — CLI spawn 메커니즘 (본 스킬 Step 2 활용)
- `_AGENT_COMMS/README.md` — 큐 규약 (frontmatter, 트리거 체인, archive)
- `.claude/rules/custom/agent-ownership.md § 에이전트 간 소통` — frontmatter 일괄 확인 (R087), 큐 트리거 분류 4종 SOP
- `.claude/rules/core/distribution-sync.md` — Claude 직접 SellingVault 접근 룰
- `.claude/rules/core/script-creation-approval.md` — 워커 스크립트 생성 시 사용자 승인 강제

## 본 스킬과 직접 작업의 선택 기준

| 조건 | 직접 작업 | 위임 (`/delegate-task`) |
|------|---------|----------------------|
| 분량 | 1세션 내 | 1세션 초과 가능 |
| 메모리 의존 | 본 세션 맥락 강함 | 콜드 스타트 가능 |
| 즉시 결정 | 사용자 대기 필요 | 자율 진행 가능 |
| 동시 수정 위험 | 단일 영역 | 영역 분리 가능 |
| 결과 추적 | 메인 응답에서 | 큐 status + 트리거 파일 |
