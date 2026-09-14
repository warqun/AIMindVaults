# 디스코드 무인 인박스 — 설치와 사용

> 폰으로 디스코드에 한 줄 던지면 PC 의 Claude Code 가 그 일을 하고 결과를 디스코드로 보고한다.
> PC 앞에 앉지 않고 볼트 작업을 시킬 수 있다. 이 문서는 **이 배포본 기준** 절차다.

```
폰 #task-queue 에 "타일 색 다시 봐줘"      (앞에 [codex] 를 붙이면 Codex 가 돈다)
        ↓  5분마다 도는 작업 스케줄러
poll_inbox.py    메시지를 _INBOX.md "대기 중" 에 적재하고 📥 를 붙인다
        ↓
폰에서 그 메시지에 ▶️ 반응            ← 실행 스위치는 사람이 누른다
        ↓
run_trigger.py   ▶️ 발견 → ⏳ → Run-AgentTask.ps1 → Claude Code 가 항목 1건 처리 + 커밋
        ↓
#log-claude      결과 보고 · 스크린샷 · 남은 사용량. 메시지엔 ✅ 또는 ❌
```

성질 세 가지. 설치 중에 이걸 흔들면 시스템 성격이 바뀐다.

- **적재와 실행이 분리돼 있다.** 적재는 항상 돌고 실행만 `!trigger off/on` 으로 껐다 켠다
- **실행 스위치는 항상 사람이 누른다.** 큐를 자동으로 비우지 않는다
- **푸시하지 않는다.** 무인 범위는 커밋까지. 원격 반영은 사람이

## 0. 파일 위치

```
<루트>/
├── _INBOX.md                        큐 (사람이 쓰는 대기열). 배포본에 빈 템플릿이 들어 있다
├── _AGENT_TASKS/README.md           긴 지시를 파일로 던지는 두 번째 큐 (선택)
└── _tools/agent-daemon/
    ├── discord/
    │   ├── discord_io.py            디스코드 REST 입출력
    │   ├── poll_inbox.py            #task-queue → _INBOX.md 적재
    │   ├── run_trigger.py           ▶️ 감시 → 무인 실행 발동
    │   └── discord_config.example.json   ← 복사해서 discord_config.json 을 만든다
    └── daemon/
        ├── Run-AgentTask.ps1        claude -p / codex exec 무인 실행 래퍼
        ├── run_agent_tasks.py       _AGENT_TASKS/todo 러너
        ├── claude_usage.py          보고 끝에 붙는 모델·남은 사용량 줄
        ├── tasks/inbox-task.md      무인 회차가 따르는 지시서
        └── profiles/inbox-task.json 권한 프로파일 (되돌리기 어려운 명령 deny)
```

## 1. 전제

| 항목 | 확인 | 비고 |
|------|------|------|
| Windows 10/11 | — | 작업 스케줄러 · PowerShell 5.1 기준 |
| Python 3.10+ | `python --version` | 외부 패키지 없음 (표준 라이브러리만) |
| Claude Code CLI | `claude --version` | 로그인까지 끝나 있어야 한다 |
| 이 저장소가 git clone 된 상태 | `git status` | 래퍼가 `.git` 을 위로 찾아 루트를 잡는다 |
| 루트에 `Vaults/` + `CLAUDE.md` | — | 스크립트의 루트 판정 기준 |
| 디스코드 계정 + 폰 앱 | — | 던지고 ▶️ 누르는 게 폰에서 일어난다 |

기본 설치 (Node.js, Obsidian, 볼트 동기화) 는 `SETUP_GUIDE.md` 를 먼저 끝낸다.

`pythonw.exe` 절대경로를 적어 둔다 (스케줄러는 PATH 를 안 물려받는다):

```powershell
(Get-Command python).Source -replace 'python\.exe$','pythonw.exe'
```

## 2. 디스코드 봇 만들기 — 토큰 발급

1. https://discord.com/developers/applications → **New Application** → 이름 아무거나 → Create
2. **Bot** 탭 → **Reset Token** → 문자열 복사. 이 화면을 벗어나면 다시 못 본다 (잃으면 다시 Reset)
   - 토큰은 점(`.`) 2개로 나뉜 3토막. 점이 2개가 아니면 애플리케이션 ID 나 퍼블릭 키를 잘못 복사한 것
3. 같은 탭 **Privileged Gateway Intents → MESSAGE CONTENT INTENT 켬**
   - 안 켜면 메시지 본문이 빈 문자열로 온다. "적재 0건인데 에러도 없음" 증상의 1순위 원인
4. **Public Bot** 은 끈다

### 토큰은 파일에만 둔다

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.secrets" | Out-Null
notepad "$env:USERPROFILE\.secrets\aimv_agent_bot_token.txt"
```

토큰 한 줄만 붙여넣고 저장. 저장소 밖이라 git 에 안 올라간다.
**채팅·스크린샷·커밋에 절대 싣지 않는다.** 노출했으면 Reset Token 하고 파일만 갈아 끼운다.

## 3. 서버와 채널

**개인 작업 서버를 새로 판다.** 남들 있는 서버에 붙이지 않는다 — 채널에 들어온 누구든 지시할 수 있게 된다.

1. 서버 추가 → 직접 만들기 → 나와 친구들을 위한 서버
2. 텍스트 채널 3개

   | 채널 | 용도 |
   |------|------|
   | `#task-queue` | 사람이 지시를 던지고 ▶️ 를 누르는 곳. 봇은 📥⏳✅❌ 반응만 단다 |
   | `#log-claude` | Claude 회차의 보고 |
   | `#log-codex` | Codex 회차의 보고 (Codex 를 안 쓰면 만들기만 해 둔다) |

### 봇 초대

Developer Portal → **OAuth2** 탭 → **Client ID** 복사 → 아래 URL 의 `<CLIENT_ID>` 를 바꿔 브라우저에서 연다.

```
https://discord.com/api/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot&permissions=117824
```

`117824` = View Channels + Send Messages + Add Reactions + Embed Links + Attach Files + Read Message History.
**관리자 권한을 주지 않는다.** 초대 후 세 채널 모두에서 봇이 멤버로 보이는지 확인.

### ID 4개 복사

디스코드 설정 → 고급 → **개발자 모드** 켠 다음:

| 무엇 | 어떻게 |
|------|--------|
| `#task-queue` 채널 ID | 채널 우클릭 → 채널 ID 복사 |
| `#log-claude` 채널 ID | 같음 |
| `#log-codex` 채널 ID | 같음 |
| **본인** 사용자 ID | 자기 프로필 우클릭 → 사용자 ID 복사 |

사용자 ID 를 봇 ID 와 헷갈리지 않는다. 잘못 넣으면 모든 메시지가 걸러져 적재가 영원히 0건.

## 4. 설정 파일

```powershell
cd <루트>\_tools\agent-daemon\discord
Copy-Item discord_config.example.json discord_config.json
notepad discord_config.json
```

`<...>` 만 채운다. 경로 구분자는 슬래시. `allowed_authors` 에 넣은 사람 **전원**이 이 PC 에 명령을 내릴 수 있다 — 기본은 본인 하나.
`discord_config.json` 은 `.gitignore` 에 있어 커밋되지 않는다.

`_INBOX.md` 는 루트에 이미 있다. `## 대기 중` 헤더를 지우지 않는다 — 적재가 그 헤더를 찾는다.

## 5. 연결 시험 — 스케줄러 걸기 전에 손으로

앞 단계가 통과 안 하면 다음으로 넘어가지 않는다.

```powershell
cd <루트>\_tools\agent-daemon\discord

python poll_inbox.py --selftest        # 네트워크 없이 로직만
python run_trigger.py --selftest
python poll_inbox.py --init            # 커서를 현재 최신으로 (과거 메시지를 안 쓸어담게)

# #task-queue 에 아무 말이나 한 줄 던진 다음
python poll_inbox.py --dry-run         # 무엇이 들어올지만 출력
python poll_inbox.py                   # POLL_DONE added=1 이면 성공. 메시지에 📥, _INBOX.md 에 줄
```

그 메시지에 ▶️ 를 누르고:

```powershell
python run_trigger.py --status         # enabled=True device=<호스트명> runner=True
python run_trigger.py --dry-run        # TRIGGER dryrun=1 msg=... 이면 발동 대상을 찾은 것
```

래퍼만 따로:

```powershell
& <루트>\_tools\agent-daemon\daemon\Run-AgentTask.ps1 -Task inbox-task -DryRun
```

`claude 실행 파일을 찾지 못함` 이면 `(Get-Command claude).Source` 로 위치를 확인해 `Run-AgentTask.ps1` 의 후보 경로 목록에 추가한다.

| 증상 | 원인 |
|------|------|
| `토큰 형태가 아니다 (점 N개)` | 토큰 대신 애플리케이션 ID·퍼블릭 키를 복사 |
| `Discord GET ... -> 401` | 토큰이 틀렸거나 Reset 후 파일을 안 갈았다 |
| `Discord GET ... -> 403` | 봇이 그 채널을 못 본다. 초대 권한 확인 |
| `added=0` 인데 에러 없음 | `allowed_authors` 가 본인 ID 가 아니다 · MESSAGE CONTENT INTENT 꺼짐 · 새 메시지 없음 |
| `멀티볼트 루트를 못 찾았다` | 루트에 `Vaults/` 와 `CLAUDE.md` 가 같이 있어야 한다 |

## 6. 무인 실행 한 번 — 스케줄러 없이

```powershell
python run_trigger.py
```

처음 한 번은 콘솔에서 지켜본다. ⏳ → `#log-claude` 에 "실행 시작" → ✅ 또는 ❌.
로그는 `<루트>\.vault_data\logs\inbox-task_*.log`. 잠금 `inbox-task.lock` 이 있으면 앞 회차가 도는 중이라 건너뛴다.

## 7. 작업 스케줄러 — 5분마다

여기까지 통과한 다음에 건다. 통과 전에 걸면 5분마다 조용히 실패해서 원인을 못 찾는다.

```powershell
$root   = 'C:\AIMindVaults'                       # 저장소 루트
$py     = 'C:\Users\<사용자명>\AppData\Local\Programs\Python\Python312\pythonw.exe'
$script = "$root\_tools\agent-daemon\discord\run_trigger.py"

$action  = New-ScheduledTaskAction -Execute $py -Argument "`"$script`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(1) `
           -RepetitionInterval (New-TimeSpan -Minutes 5)
$set     = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
           -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask -TaskName 'AIMV-Discord-Trigger' -Action $action -Trigger $trigger `
  -Settings $set -Description 'Discord 반응 트리거 폴링 — 인박스 항목 1건 무인 처리'
```

- `pythonw.exe` 를 쓴다. `python.exe` 면 5분마다 콘솔 창이 떠 전체화면 게임 포커스를 뺏는다
- 노트북이면 `$set` 에 `-AllowStartIfOnBatteries -DontStopIfGoingOnBatteries` 를 더한다

```powershell
Get-ScheduledTask     -TaskName 'AIMV-Discord-Trigger'
Start-ScheduledTask   -TaskName 'AIMV-Discord-Trigger'   # 지금 한 번
Disable-ScheduledTask -TaskName 'AIMV-Discord-Trigger'   # 백그라운드 활동 0
Enable-ScheduledTask  -TaskName 'AIMV-Discord-Trigger'
```

## 8. 평소 사용법

1. 폰 `#task-queue` 에 한 줄. 형식 없다. 사진을 같이 올려도 된다
   - 맨 앞 대괄호로 에이전트·모델·생각수준 — `[codex]` · `[opus:xhigh]` · `[codex:gpt-6-astra:high]`. 순서 무관.
     모르는 값이 하나라도 있으면 실행하지 않고 ⚠️ 를 단다 (오타 방어)
2. 5분 안에 📥 (= 큐에 들어갔다)
3. 실행시킬 메시지에 **▶️**
4. ⏳ → ✅ 또는 ❌. 결과는 그 에이전트의 로그 채널

**▶️ 를 안 누르면 아무 일도 안 일어난다.** 쌓아두고 나중에 PC 앞에서 처리해도 된다.

`!` 로 시작하는 줄은 큐에 안 들어가는 제어 명령이다.

| 명령 | 동작 |
|------|------|
| `!trigger off` / `on` / `status` | 실행 중단 (적재는 계속) / 재개 / 상태 |
| `!runner` | 켜져 있는 디바이스들이 각자 이름·상태를 답한다 |
| `!runner <호스트명>` | 저장소를 여러 PC 에 복제했을 때 한 대만 실행하게 지정 |

## 9. 안전 경계 — 풀지 않는다

무인 회차는 `bypassPermissions` 로 돈다 (권한을 묻지 않는다). 그래서 경계가 여러 곳에 겹쳐 있다.

| 경계 | 어디에 |
|------|--------|
| 지정한 사람만 지시할 수 있다 | `discord_io.is_from_allowed_human` |
| 큐가 비면 아무것도 안 한다 | 지시서 § 0 — 할 일을 지어내면 며칠씩 헛도는 루프가 된다 |
| 한 회차에 한 항목만 | 지시서 § 1 |
| 판단이 갈리면 멈춘다 | 지시서 § 4 — `- [?]` 로 보류하고 사유를 남긴다 |
| 푸시 안 함 | 지시서 § 6 + 래퍼 프롬프트 + 권한 프로파일 `deny` |
| 되돌리기 어려운 명령 차단 | `profiles/inbox-task.json` |
| 결제·계정 변경·외부 발행 금지 | 지시서 § 6-1 |

## 10. 점검표

- [ ] 봇 생성 · **MESSAGE CONTENT INTENT 켬**
- [ ] 토큰이 `~/.secrets/` 파일에만 있다
- [ ] 개인 서버에 채널 3개, 봇 초대 (권한 117824, 관리자 아님)
- [ ] `discord_config.json` 의 채널 ID 3개 + **본인** 사용자 ID
- [ ] `--selftest` 2종 통과 · `--init` 커서 초기화
- [ ] 손으로 `poll_inbox.py` → `added=1` + 📥
- [ ] `run_trigger.py --dry-run` → 발동 대상 인식
- [ ] `run_trigger.py` 한 회차 완주 → ✅ + 로그 채널 보고
- [ ] 스케줄러 등록 (`pythonw.exe`, 5분)
- [ ] `!trigger off` / `on` 이 `#log-claude` 에 응답
