# 에이전트 소유권 분리 (Mandatory)

> Non-git 환경에서 에이전트 간 파일 충돌 방지.

## 에이전트별 소유권

### Claude Code (메인 에이전트)

- 멀티볼트 구조 변경 (볼트 생성, 폴더 재구조화)
- 스크립트 개발/수정 (`_tools/cli-node/`)
- 규칙/스킬 작성 (`.claude/rules/`, `.claude/commands/`)
- `.obsidian/` 설정 변경
- 복수 볼트에 걸치는 작업

### Codex (보조 에이전트)

- 단일 볼트 내 노트 편집 (`Contents/`)
- 반복 작업 (frontmatter 일괄 갱신, Juggl 삽입 등)
- 백그라운드 정리 (링크 정리, 태그 정리)
- 배포 동기화 실행 (`sync-distribution` 스킬)

## 동시 수정 금지 영역

아래 파일은 **한 에이전트만** 수정할 수 있다. 동시 수정 시 데이터 손실 위험.

| 파일 | 사유 |
|------|------|
| `_STATUS.md` (볼트/루트) | 상태 추적의 단일 소스 |
| `_WORKSPACE_VERSION.md` | 버전 번호 충돌 |
| `.obsidian/**` | Obsidian 설정 파일 — JSON 병합 불가 |
| `_VAULT-INDEX.md` | 문서 맵 — 동시 편집 시 구조 깨짐 |

## 운용 규칙

1. 작업 시작 시 `_STATUS.md`의 작업 에이전트를 확인한다.
2. 다른 에이전트가 동일 볼트에서 최근 작업 중이면, 해당 에이전트의 `AGENT_STATUS.md`를 확인하여 충돌 여부를 판단한다.
3. 충돌 가능성이 있으면 사용자에게 확인 후 진행한다.
4. 세션 종료 시 `_STATUS.md` 작업 에이전트를 자신으로 갱신하여 다음 에이전트에게 알린다.

## 에이전트 간 소통 (`_AGENT_COMMS/`)

> 2026-04-23 도입. 에이전트 간 메시지·교차검증·의사결정 논의 전용 루트 폴더 (볼트 아님).

### 세션 진입 시 스캔

- Claude 는 `{멀티볼트 루트}/_AGENT_COMMS/to_claude/` 스캔
- Codex 는 `{멀티볼트 루트}/_AGENT_COMMS/to_codex/` 스캔
- 파일이 다수 (3 건 이상) 또는 git pull 직후 신규 파일 포함 시 — **frontmatter 일괄 확인 후 분류 보고**
- 사용자가 명시적으로 "처리해" · "읽어봐" 하지 않으면 자동 실행 금지

#### Frontmatter 일괄 확인 (강제)

다수 파일을 추정으로 보고 금지. 다음 중 하나로 status·from·to 일괄 확인:

```bash
# 옵션 A — Grep 도구 (권장)
# pattern: "^status:" output_mode: content path: _AGENT_COMMS/to_claude/

# 옵션 B — bash 일괄
grep -H "^status:" _AGENT_COMMS/to_claude/*.md
```

확인 후 보고 포맷:

```
_AGENT_COMMS/to_claude/ — 총 N 건
- open (M 건): 파일명 + 1줄 요약
- in-progress (K 건): 파일명 + 1줄 요약
- resolved (L 건): "1주 경과 시 archive 대상" 표기만
- 자기 발신 self-memo / 상대 발신 / 완료 트리거 분류 명시
```

#### 큐 트리거 분류 (강제)

`to_{self}/` 파일은 다음 4 종 중 하나. 분류 없이 "큐잉됨" 추정 보고 금지.

| 종류 | 파일명·frontmatter 패턴 | 처리 방향 |
|------|----------------------|----------|
| 신규 작업 큐 | `from` ≠ self · status: open · 일반 주제 | 사용자 지시 후 처리 |
| 자기 발신 self-memo | `from` == `to` (예: from=claude · to=claude) | 다음 세션의 자기 자신용 — 일반 큐 동급 처리 |
| 완료 트리거 | 파일명 끝 `_완료.md` · status: open | 후속 작업 진입 신호 — 원본 큐 본문 § "완료 보고" 따라 후속 |
| 사용자 메시지 | `from`: user 또는 외부 | 외부 입력 — 일반 큐 동급 처리 |

**금지**: status·from 미확인 상태로 "모두 큐잉 추정" 보고. status: resolved 인 과거 응답을 큐로 분류 보고.

### 메시지 작성

- 상대에게 보낼 때 `_AGENT_COMMS/to_{상대}/` 에 생성
- 파일명: `{YYYYMMDD}_{from}_{to}_{주제}.md`
- Frontmatter 필수: `type: agent-comm`, `from`, `to`, `status`, `created`, `updated`
- 본문: 목적 · 맥락 · 요청 · 기대 출력 · 주의
- 3회 이상 오갈 주제는 `_AGENT_COMMS/threads/` 에 생성

### 응답

- **같은 파일 하단** 에 `## 응답` 섹션 추가 (분리하지 않음)
- status 를 `open` → `in-progress` → `resolved` 로 갱신
- `resolved` 상태 1주 경과 시 `archive/YYYY-MM/` 이동

### 태스크 미리 등록 (큐잉)

지금 세션에서 처리 안 하고 **다음 세션 / 상대 에이전트가 처리할 작업**을 미리 큐잉:

- 상대 폴더 (`to_{상대}/`) 에 `status: open` 파일 생성
- 본문은 **자기완결적 프롬프트** — 상대가 콜드 상태에서 읽고 바로 실행 가능해야 함
- 세션 진입 프로토콜이 자동으로 수집·보고

### 세션 종료 시 정리 루틴 (강제)

세션 종료 직전 `to_{self}/` 점검:

1. `resolved` + 7일 경과 → `archive/YYYY-MM/` 이동
2. `in-progress` 잔존 → 세션 핸드오프 노트에 명시
3. `open` 미처리 → 사용자에게 "다음 세션 / 지금 처리" 확인
4. 자신이 보낸 `to_{상대}/` 파일 중 `resolved` 된 것도 동일 기준 archive

### 완료 트리거 체인 (에이전트 간 작업 파이프라인)

여러 Phase 에 걸친 의존 작업을 Claude ↔ Codex 간 주고받는 프로토콜. 상세 규격: `_AGENT_COMMS/README.md § 완료 트리거 체인`.

- 지시 파일에 `## 의존 관계` + `## 완료 보고` 섹션 필수
- 작업 완료 시 상대 폴더에 트리거 파일 신규 생성 (파일명: `{YYYYMMDD}_{완료자}_{상대}_{원본주제}_완료.md`)
- 파일명에 `#`, `%`, `&`, `?`, `+` 금지 — `Task4`, `P1` 등으로 표기
- 트리거 수신자는 다음 세션 시작 시 `to_{self}/` 스캔에서 자동 발견 → 사용자 지시 후 후속 작업 착수

### 완료 트리거 처리 흐름 (강제)

1. 워커가 작업 완료 시 트리거 파일 생성 (status: open)
2. 메인 세션 / 다음 진입 에이전트가 발견 → status: in-progress 갱신 (후속 처리 시작 시점)
3. 후속 처리 완료 시 status: resolved + 응답 섹션 추가
4. **후속 큐가 별도 파일로 발행되면 트리거 파일 즉시 archive 이동** (7일 경과 안 기다림)
5. 트리거 파일이 7일 이상 open 잔존 = 후속 작업 누락 신호 — Stop hook advisory 트리거

### 금지

- `_AGENT_COMMS/` 에 콘텐츠 노트·도메인 지식·계획서 저장 금지 (각 볼트로)
- 민감값(token, API key) 평문 노출 금지 — `<redacted>` 사용
- `archive/` 파일 영구 삭제 금지 (이력 보관)

### 상세 규약

- 1:1 통신 규약 (단발 검토·교차검증·핸드오프): `_AGENT_COMMS/README.md`
- **1:N 다중 워커 패턴 (오케스트레이터 ↔ 워커 N, 큰 작업 분할 시)**: `_AGENT_COMMS/multi-worker-protocol.md` (2026-05-06 도입, R107)

### 병렬 위임 시 인덱싱 순서 (R194 — 2026-06-12 실사고)

**경로를 바꾸는 작업 (노트 이동 · 리네임 · 삭제) 과 인덱싱을 같은 병렬 구간에 두지 않는다.**

`index build` 는 실행 시점의 파일시스템을 walk 해서 인덱스를 만든다. 이동 중에 walk 하면 옛 경로가
인덱스에 박히고, viz 가 그 경로로 `obsidian://` 를 발사해 노트 열기가 실패한다.

- 인덱싱은 **오케스트레이터의 마무리 단계**. 워커 병렬 단위에 넣지 않는다.
- 순서: 파일 변경 워커 전원 완료·검증 → 영향 볼트별 `index build -i` → `index master-build` 1회.
- **예외**: 단독 소유 볼트 안에서 **경로를 안 바꾸는 편집**만 하는 워커는 `review` (자동 인덱싱 포함) 를 그대로 수행해도 된다.
- **한 볼트를 두 워커가 동시에 만지지 않는다** — 위 자동 인덱싱이 상대의 이동 중간에 끼어든다.

전체 규칙·검증 명령: `_AGENT_COMMS/multi-worker-protocol.md § 11`.

