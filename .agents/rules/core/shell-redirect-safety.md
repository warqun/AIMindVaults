# Shell Redirect Safety (Mandatory)

> 모든 볼트에 동일 적용. 모든 에이전트 공통.
> 2026-04-21 Incident 기반 — Git Bash/MSYS2 에서 CMD 구문 `2>nul` 혼용으로 `nul` literal 파일 41k+ 생성. 근본 원인은 Cygwin/MSYS2 의 POSIX 호환 설계 (Windows 예약 이름을 일반 파일명으로 허용). 상세 분석·권장 방어 레이어 근거: [[20260421_nul_파일_누적_생성_이슈_리서치]].

## 1. 셸별 NUL 리다이렉트 구문 (필수 숙지)

| 셸 | stderr 버리기 | stdout 버리기 | 둘 다 |
|----|--------------|--------------|------|
| Bash (Git Bash · Linux · macOS) | `2>/dev/null` | `>/dev/null` | `>/dev/null 2>&1` |
| PowerShell 5·7 | `2>$null` | `>$null` | `*>$null` |
| Windows CMD | `2>nul` | `>nul` | `>nul 2>&1` |

한 명령 안에서 셸별 구문 혼용 금지.

## 2. 셸 식별 기준 (에이전트 자기 교정용)

- **Claude Code Bash tool** → Git Bash 환경 (MSYS2 런타임). **Bash 구문만** 사용.
- **Codex Bash tool** → 동일 (주의: Windows native Codex hooks 현재 비활성)
- `powershell -Command` · `pwsh -Command` → PowerShell 구문
- `cmd /c` · `.bat` · `.cmd` → CMD 구문
- **불확실하면 리다이렉트 자체를 쓰지 말고** 상위 도구의 native null-handling 사용 (예: `command > /dev/null` 대신 `--quiet` 플래그)

## 3. 절대 금지

- **Bash 에서 `2>nul`, `>nul`, `2>NUL`** — Bash 는 `nul` 을 **일반 파일명**으로 해석해 CWD 에 빈 `nul` 파일 생성. 이는 MSYS2/Cygwin 의 **의도된 POSIX 호환 설계**이지 버그 아님.
- **PowerShell 에서 `2>nul`** — `2>$null` 사용 (`nul` 은 literal 파일)
- **Windows 예약 이름 (CON/PRN/AUX/NUL/COM1-9/LPT1-9)을 literal 파일/폴더명으로 사용** — 확장자 붙여도 동일 (`nul.txt`, `aux.md` 등)

## 4. 크로스플랫폼 원칙

배포본 스크립트는 **Bash 구문 (`2>/dev/null`)** 을 기본. Windows 전용 스크립트만 CMD/PowerShell 고유 구문 사용. AIMindVaults 배포 대상이 Win/Mac/Linux 크로스플랫폼이므로 Bash 구문이 이식성 최고.

## 5. 다층 방어 체계 (AIMindVaults 에 배포됨)

### 5.1 에이전트 레이어 — Claude Code `PreToolUse` hook

**배포 위치**: `.claude/hooks/block_nul_redirection.py` · `.claude/settings.json` `hooks.PreToolUse.Bash`

Bash 도구 호출 직전 명령 문자열을 검사해 `2>nul`·`>nul` 패턴 감지 시 `decision: "deny"` 반환. LLM 프롬프트는 advisory, hook 은 **deterministic**.

**Codex 제약**: Windows native hooks 현재 비활성 — wrapper/proxy 로 우회 필요 (`.claude/templates/ci/bashrc-nul-trap.sh` 참조).

### 5.2 셸 레이어 — Bash DEBUG trap

**템플릿**: `.claude/templates/ci/bashrc-nul-trap.sh`

`~/.bashrc` 또는 에이전트가 source 하는 init 파일에 append. `DEBUG` trap 이 실행 직전 `BASH_COMMAND` 를 검사해 Windows 스타일 NUL 리다이렉트 차단. `PROMPT_COMMAND` 와 달리 non-interactive 에이전트 호출도 잡음.

### 5.3 저장소 레이어 — Git pre-commit hook

**템플릿**: `.claude/templates/ci/pre-commit-reserved-names.sh` + `check-reserved-names.sh`

`.git/hooks/pre-commit` 에 설치 (또는 husky/lefthook 체이닝). staged diff 에 CON/PRN/AUX/NUL/COM1-9/LPT1-9 예약 이름 포함 시 commit 차단. 배포 레포 `C:/SellingVault/Korean|English/AIMindVaults/.git/hooks/` 에 적용.

### 5.4 CI 레이어 — GitHub Actions

**템플릿**: `.claude/templates/ci/deny-reserved-names.yml`

배포 레포 `.github/workflows/deny-reserved-names.yml` 로 설치. push/pull_request 시 전체 트리 스캔 → 예약 이름 존재 시 workflow 실패. pre-commit 은 local push, CI 는 force-push·외부 PR 방어.

### 5.5 파일시스템 레이어 — Obsidian vault watcher

**템플릿**: `.claude/templates/ci/vault-watcher.js`

Node `fs.watch` 로 볼트 루트 감시. 초기 full scan + 실시간 감시. Obsidian Shell Commands startup 이벤트 · PM2 · systemd 로 백그라운드 실행.

## 6. Incident Rule: Bash `2>nul` Creates Orphan Files (Mandatory)

**감지**:
- Bash tool 명령에 `2>nul`, `>nul`, `2>NUL`, `&>nul`, `2>>nul` 등 CMD 구문
- 에이전트 자신이 작성 중이거나 기존 스크립트에서 발견

**즉시 교정**: Bash 에서는 **`2>/dev/null` · `>/dev/null`** 만 사용. 이 규칙 위반은 `.claude/hooks/block_nul_redirection.py` 에서 자동 차단.

**사후 처리** (이미 생성된 경우):
- Windows `nul` 은 예약 이름이라 일반 `rm` · `Remove-Item` · `del` 삭제 불가 (디바이스로 해석)
- **`\\?\<full_path>\nul` UNC 접두사 + `[System.IO.File]::Delete()`** 사용 — 문자열 파싱을 끄고 파일시스템으로 그대로 전달
- `Test-Path -LiteralPath '\\?\...\nul'` 는 항상 false — 체크 없이 직접 Delete 후 예외 처리
- PowerShell 예시:
  ```powershell
  [System.IO.File]::Delete('\\?\C:\path\to\nul')
  ```

**처리량 순위** (추정, 리서치 근거):
1. Rust/C++ 네이티브 `DeleteFileW` 루프 (UTF-16 직접, 최소 오버헤드)
2. PowerShell `[System.IO.File]::Delete('\\?\...')` 루프 (객체 래핑 오버헤드)
3. `cmd del \\?\...` 배치 (예약 이름 파싱 충돌 가능성 최대, 비권장)

## 7. Incident Rule: PowerShell Recursive Scan 조기 중단 (Mandatory)

`nul` 파일 탐색 시 **PowerShell `Get-ChildItem -Recurse -Filter nul` 사용 금지**.

**근본 원인** (리서치 확정): Windows `FindFirstFileEx`/`FindNextFile` 자체가 아닌 **PowerShell FileSystemProvider 가 FileInfo materialize 에 실패**하는 구조. `-ErrorAction SilentlyContinue` 는 출력만 억제, 재귀 로직을 복구하지 못함. 결과: 상위 계층만 노출되고 하위 서브트리가 가려짐.

**징후**: 삭제 → 재스캔 → 더 많이 발견 패턴 (50 → 19 → 41,440 식). 스캔이 누락을 "발견"하는 게 아니라 **이전에 가려져 있던 서브트리가 단계적으로 풀리는 것**.

**정확한 스캔 방법** (신뢰도 순):

1. **cmd `dir /A /B /S` + `findstr /i "\\nul$"`** — Windows 디렉토리 리스팅 API. 예약명 유령 없음.
2. **Python `os.scandir` / `os.walk`** — Windows 에서 `FindFirstFileW`/`FindNextFileW` 직접 호출. PowerShell 중간층 없음.
3. **Rust `walkdir` 크레이트** — 기본값 `follow_links(false)`, 대규모 트리 최고 성능.
4. **PowerShell `Get-ChildItem -Recurse` (Filter 없이) + `Where-Object { $_.Name -eq 'nul' }`** — Filter 우회로 유령 감소 (엣지 케이스 남을 수 있음).

**검증 방법** (스캔 결과가 실제 파일인지):

```powershell
# 실제 파일이면 Exists=True, 유령이면 False
[System.IO.File]::Exists('\\?\C:\path\to\nul')
```

`[System.IO.File]::Delete('\\?\...')` 호출 시 예외 메시지가 `'\\.\nul' 경로에 대한 액세스가 거부되었습니다` 이면 파일 없음, 성공하면 실제 파일 삭제.

**참조 Incident**: 2026-04-21 AIMindVaults — `Get-ChildItem -Filter nul` 이 41,440 건 반환, cmd `dir` 0건. 총 실제 삭제는 50+19+41,440 (가려진 서브트리가 단계적 노출) 로 해석.

## 8. Incident Rule: Obsidian Shell Commands 플러그인 셸 감사 (Mandatory)

Obsidian Shell Commands 플러그인은 전역 default shell 을 CMD/PS5/PS7/custom 중 선택 가능. `.space/`·`#태그/` 같은 **동적 생성 폴더 내부**에 `nul` 이 생겼다면 Obsidian 세션 중 자동 명령이 Git Bash/custom bash 에서 실행된 단서.

**감사 절차**:
1. 전역 default shell 설정 확인
2. 명령별 override shell 확인
3. custom shell path 가 `bash.exe`/`sh.exe`/`git-bash.exe` 인지
4. startup/open-file/create-file 이벤트 트리거 명령 확인
5. 모든 명령 문자열에서 `nul`, `NUL`, `2>nul`, `>nul`, `sh -c`, `bash -lc` 검색
6. 의심 명령 일시 중지 또는 `/dev/null` 구문으로 교체

## 9. Windows 예약 이름 전체 (확장)

| 범주 | 이름 |
|------|------|
| 디바이스 | `NUL`, `CON`, `PRN`, `AUX` |
| 시리얼 포트 | `COM1`, `COM2`, `COM3`, `COM4`, `COM5`, `COM6`, `COM7`, `COM8`, `COM9` |
| 병렬 포트 | `LPT1`, `LPT2`, `LPT3`, `LPT4`, `LPT5`, `LPT6`, `LPT7`, `LPT8`, `LPT9` |

대소문자 무관. 확장자 붙여도 동일 (`nul.txt`, `con.md` 등). 같은 셸 혼용 사고가 `con`, `aux`, `prn` 등에도 동일 급 장애 유발 가능.

## 10. 참조

- 딥 리서치 (외부 LLM): [[20260421_nul_파일_누적_생성_이슈_리서치]]
- 2026-04-21 Incident 배포 변경 로그: [[20260317_배포_동기화_규칙]] R069 ~ R072
- Claude Code hooks 공식 문서: https://docs.claude.com/en/docs/claude-code/hooks
- Microsoft DOS 예약 이름 + `\\?\` UNC prefix: MSDN Win32 File Namespaces
- 템플릿 디렉토리: `.claude/templates/ci/` (5 파일)
- Hook 배포 위치: `.claude/hooks/block_nul_redirection.py` + `.claude/settings.json`
