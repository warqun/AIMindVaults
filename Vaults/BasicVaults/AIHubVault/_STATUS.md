---
type: status
updated: 2026-04-13
---
# STATUS — 현재 진행 현황

> **이 문서가 이 볼트의 유일한 상태 문서다.**
> 모든 에이전트는 세션 종료 시 이 파일을 직접 갱신한다.
> AGENT_STATUS는 에이전트 자체 판단으로 선택적 기록.

## 이 볼트의 역할

> **AI 작업환경 설계·개선·배포 허브**
> - `_Standards`, `_tools`, `.claude`, `.forge` 등 AI 운영 구조 관리
> - 게임 개발/기획 작업은 이 볼트에서 수행하지 않음

## Now (현재 집중)

- **cli-node Phase 0~6 전체 완료 + 배포** — 10개 PS1 스크립트 → Node.js ESM 포팅 완료 (2,475→1,840 LOC, 26% 감소). SellingVault 6회 배포 + GitHub push 완료
- Phase별 commit: `51c5fcc` (0-1), `e874636` (2), `222b6b3` (3), `0cd51cd` (4), `a5abfbc` (5), `06a6a56` (6)
- _WORKSPACE_VERSION 202604130006~11 기록 완료

## Next (다음 작업)

- Shell Commands에서 PS1 → JS 전환 등록 (Obsidian 설정)
- PS1 fallback 제거 (JS only 전환)
- Mac/Linux에서 `node cli.js sync`, `node cli.js index build` 실테스트

## Blocked (막힘/결정 필요)

없음

## Decisions (결정 사항)

- (2026-04-09) **배포본 Codex 테스트 통과**: 온보딩 문서 기반으로 Codex가 코어 규칙 15개를 전부 준수함을 확인. 배포본 실사용 가능 상태 확정
- (2026-04-09) **pre_sync.ps1 자기참조 판정 위치 변경**: Hub 탐색 로직이 현재 볼트를 제외하는 구조이므로, .hub_marker 존재 확인을 탐색 전에 수행
- (2026-04-08) **노트 작업 완료 조건 강화**: 노트 추가/편집 작업은 `POST_EDIT_REVIEW_BAD=0`만으로 끝내지 않고 `POST_EDIT_INDEX_UPDATED=1`까지 확인해야 완료다. `SKIPPED=1` 또는 `UPDATED=0`이면 수동 인덱싱 후 다시 확인한다
- (2026-04-08) **Codex 소스 노트 파이프라인 분리 유지**: 영상/웹 글/PDF 노트화 절차는 root `.codex/skills/`에서 Codex 전용으로 관리하고 `.claude/commands/custom/`를 공유하지 않는다
- (2026-03-23) **Workspace 3계층**: Core(강제 동기화) / Custom(동기화되지만 prune 가능) / Vault-local(미동기화)
- (2026-03-23) **Core 플러그인 4개 확정**: local-rest-api, dataview, templater, linter
- (2026-03-23) **Juggl_StyleGuide Custom 격하**: Core → Custom Batch로 이동
- (2026-03-23) **_VAULT-INDEX.md 동기화 제거**: Vault-local (볼트마다 구조 다름)
- (2026-03-23) **Linter data.json만 강제 동기화**: local-rest-api는 API키/인증서 포함으로 보존
- (2026-03-23) **에이전트 진입점 파일 배포 제외**: CLAUDE.md, CODEX.md, AGENT_STATUS.md
- (2026-03-21) **볼트 콘텐츠 인덱서 도입**: JSON 기반 메타데이터 인덱스 + 가중치 랭킹 검색
- (2026-03-21) **에이전트 체제 변경**: 4에이전트 → 2에이전트 (Claude Code + Codex)
- (2026-03-21) **트램펄린 패턴 도입**: pre_sync.ps1 자기 업데이트 시 새 프로세스로 재실행. chicken-and-egg 구조적 해결
- (2026-03-21) **버전 로그 분리**: _WORKSPACE_VERSION.md 경량화 (1행) + _WORKSPACE_CHANGELOG.md (Hub 전용)
- (2026-03-21) **Obsidian 자동 리로드**: sync 후 새 플러그인 감지 시 Local REST API로 app:reload 트리거
- (2026-03-21) **플러그인 동기화 방식 확정**: community-plugins.json 텍스트 기반 직접 머지 (Advanced URI .bat 방식 폐기)
- (2026-03-20) **네임스페이스 분리**: .claude/rules/ 및 commands/를 core/custom 분리. 신규는 custom 우선, 검증 후 core 격상
- (2026-03-20) **플러그인 동기화**: Batch 0 추가, community-plugins.json 직접 편집 대신 Advanced URI enable-plugin 방식 (이후 2026-03-21에 폐기됨)
- (2026-03-20) **파일명 규칙**: URI 예약문자(#%&?+) 파일명 사용 금지, 대체 표기(CSharp, CPP, QnA)
- (2026-03-20) **볼트 라우팅 규칙 신설**: BasicContentsVault 직접 작업 금지, 미등록 볼트 자동 등록
- (2026-03-20) **workspace 편집 순서 강화**: 수정 → 즉시 버전 기록 → 그 다음 배포/테스트
- (2026-03-15) **상태 시스템 재설계**: AGENT_STATUS 병합 방식 폐지 → `_STATUS.md` 직접 갱신 필수, AGENT_STATUS는 권장으로 격하
- (2026-03-15) **4에이전트 체제 확립**: Claude Code / Codex / Antigravity / Cursor
- (2026-03-14) **멀티볼트 환경 전환 완료**: 디렉토리 재구성 + 루트 허브 생성
- (2026-03-10) **루트 Codex 허브 도입**: 루트 `CODEX.md` + `.codex/`
- (2026-03-09) **에이전트 진입점 분리**: CLAUDE.md / CODEX.md / SESSION_RULES.md
- (2026-03-09) **스크립트 중복 방지 체계**: Script_Registry.md + Script_Creation_Rule.md
- (2026-03-08) **볼트 범위 확정**: AI 작업환경 허브 (게임 개발/기획 배제)
