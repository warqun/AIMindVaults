# 배포 콘텐츠 개인정보 안전 (Mandatory)

> 모든 볼트·에이전트 공통. 2026-04-25 Incident 기반.

## 배경 (Incident)

`AGENT_ONBOARDING.md § 2 볼트 구성` 표에 사용자 개인 볼트명 (JissouGame, CombatToolKit, TileMapToolKit, Unity_Documentation, Diary, GameDesign, GameArt, LightAndColor, AppFlowy, Funding 등) 이 그대로 카테고리 예시로 들어가 있어 SellingVault 로 배포 시 **새 사용자가 받는 문서에 작성자 개인 사정 노출** 됐을 가능성. 새 사용자 입장에선 본인이 만들지도 않은 볼트 이름이 카테고리 예시로 나와 혼란.

## 규칙

### 절대 금지 — 배포 대상 문서에 사용자 개인 자산 인용

다음 자산을 **배포 대상 문서** 본문·예시·테이블·코드 블록에 포함 금지:

| 금지 자산 | 예시 (실제 사용자 등록 자산) |
|----------|------------------------|
| 사용자 추가 볼트명 | JissouGame, CombatToolKit, TileMapToolKit, MachineAssembly, CookingLab 등 |
| 사용자 추가 카테고리 | Domains_Manufacturing, Lab_Game, Projects_Game 등 사용자가 만든 카테고리 |
| 외부 readonly 자료 이름 | Unity_Documentation 등 사용자가 다운받은 자료 |
| 개인 프로젝트명 | Project_MyVaults 등 사용자 운영용 |
| 개인 hostname / 사용자명 / 디바이스명 | (절대 인용 금지) |

### 배포 대상 문서 (식별)

**배포 대상**:
- 루트 진입점: `CLAUDE.md`, `AGENTS.md`, `CODEX.md` 일부, `AGENT_ONBOARDING.md`, `AGENT_ONBOARDING_*.md`
- 루트 README, `.claude/`, `.codex/`, `.cursor/` 의 core/ 영역
- `Vaults/BasicVaults/` 전체 (CoreHub · Preset Hub · Basic*Vault 클론 템플릿)
- `_Standards/Core/` 가이드
- `.claude/rules/core/`, `.claude/commands/core/`
- `.claude/templates/`

**배포 미대상 (개인 자산 OK)**:
- `_STATUS.md` (사용자 볼트 레지스트리 — 배포 시 빈 템플릿화 또는 제외)
- `_SESSION_HANDOFF_*.md` (세션 컨텍스트)
- `_ROOT_VERSION.md` (변경 이력)
- `_AGENT_COMMS/` (에이전트 간 소통 — 배포 미포함)
- `Contents/**` (각 볼트 사용자 콘텐츠)
- `.claude/rules/custom/`, `.claude/commands/custom/`
- 워크트리 (`.claude/worktrees/`)
- 메모리 (`~/.claude/projects/*/memory/`)

### 카테고리 예시 작성 규약

배포 문서에서 카테고리·구조를 설명할 때:

**✗ 금지** (실제 사용자 자산 인용):
```
| Domains_Game | Vaults/Domains_Game/ | Unity, GameDesign, GameArt |
| Personal | Vaults/Personal/ | Diary |
```

**✓ 권장** (추상 패턴 + 용도 설명):
```
| Domains_* | Vaults/Domains_*/ | 도메인 지식 볼트 (사용자 관심 영역별 추가) |
| Personal | Vaults/Personal/ | 개인 기록 볼트 (Diary 등, AI 접근 제한 가능) |
```

또는 `_STATUS.md` 의 볼트 레지스트리 참조로 우회:
```
실제 등록 볼트는 _STATUS.md 의 볼트 레지스트리 섹션 참조 (사용자 환경별 다름).
```

### 키워드 라우팅·매핑 작성 규약

`CLAUDE.md`·`AGENTS.md` 의 키워드 → 볼트 ID 매핑은 **배포 시점에 빈 템플릿** 으로 두거나 제너릭 예시만 포함:

**✗ 금지**:
```
| Unity, 유니티 | Unity |
| 게임 기획, 레벨 디자인 | GameDesign |
```

**✓ 권장** (제너릭 패턴):
```
| <도메인 키워드> | <대응 볼트 ID> |
| (예: Python, 파이썬) | (예: Python) |
```

또는 사용자 가이드 안내:
```
키워드 매핑은 사용자가 추가하는 볼트마다 본인 환경에 맞춰 작성한다.
```

### 변경 로그·이력 작성 규약

`_ROOT_VERSION.md`·배포 동기화 규칙 변경 로그 항목 작성 시:
- 변경 내용에 **사용자 개인 볼트명 적시 가능** (이력 추적 목적). 단 이런 항목은 Korean/English 컬럼을 `–` 로 두어 SellingVault 배포 제외.
- 일반 룰·도구·구조 변경은 ✅/🕓 로 배포.

## Incident Rule: 배포 대상 문서 신규 작성·수정 시 사전 점검 (Mandatory)

작업 흐름:

1. 작성·수정 대상이 **배포 대상** 인지 위 분류표로 확인
2. 배포 대상이면 **사용자 개인 자산 인용 0건** 검증
3. 검증 후 commit
4. 의심되면 사용자에게 "이 부분이 사용자 개인 자산을 인용하는데 일반화할까?" 확인

자동 검증 도구 (선택, 작성 시 권장):

```powershell
# 배포 대상 문서 변경 시 개인 자산 키워드 스캔
$personal = @('JissouGame', 'CombatToolKit', 'TileMapToolKit', 'MachineAssembly', 'CookingLab', 'Project_MyVaults', 'Unity_Documentation')
$file = '<배포 대상 파일 경로>'
$content = Get-Content $file -Raw
$found = $personal | Where-Object { $content -match $_ }
if ($found) { Write-Warning "개인 자산 인용 발견: $($found -join ', ')" }
```

(개인 자산 리스트는 `_STATUS.md` 볼트 레지스트리에서 동적 추출 가능 — 향후 자동화 후보)

## SellingVault 배포본 정리 (별도 작업)

본 룰 도입 이전에 배포된 SellingVault (Korean/English) 의 다음 파일은 **개인 자산 잔존 가능성** — `/distribute` 스킬 다음 실행 시 일괄 점검 + 일반화 정리:

- `AGENT_ONBOARDING.md` (확인됨, 본 룰 도입과 함께 일반화 — R084)
- `CLAUDE.md` 키워드 매핑 (점검 필요)
- `AGENTS.md` 키워드 매핑 (점검 필요)
- `_STATUS.md` 볼트 레지스트리 (배포 시 빈 템플릿 처리 필요)
- 기타 `.claude/rules/core/`, `.claude/commands/core/` 본문에 인용된 사용자 자산 (점검 필요)

## 참조

- 인시던트 발견: 2026-04-25 사용자 보고 ("온보딩 § 2 볼트 구성에 개인 정보 노출")
- 관련 룰: `.claude/rules/core/distribution-sync.md` (배포 동기화 일반)
- 배포 변경 로그: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/distribution/20260317_배포_동기화_규칙.md`
