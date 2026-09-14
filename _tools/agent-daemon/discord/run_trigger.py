# -*- coding: utf-8 -*-
"""
디스코드 ▶️ 반응 → 인박스 항목 1건 무인 처리 실행.

poll_inbox.py 가 "큐에 넣기" 라면 이쪽은 "지금 실행". 둘을 나눈 이유는
**적재는 항상 돌아야 하고 실행은 껐다 켤 수 있어야** 하기 때문이다.
적재까지 끄면 `!trigger on` 을 읽을 수단이 없어진다.

  python run_trigger.py            평소 (스케줄러가 부름)
  python run_trigger.py --status   현재 on/off · 이 디바이스 · 지정 디바이스 출력
  python run_trigger.py --dry-run  실행 없이 무엇이 발동될지만

@custom-feature: discordTrigger
  viz 설정 "커스텀 기능 → 무인 인박스 실행" 토글과 **같은 키**를 본다
  (`.vault_data/viz-prefs.json` 의 `discordTrigger`). 상태를 따로 두면
  viz 토글과 폰 `!trigger` 가 어긋난다.

디바이스 지정 (`!runner`, 2026-09-06):
  저장소가 여러 디바이스에 복제돼 있고 각각 스케줄러를 걸면 **같은 ▶️ 를 둘이 집는다.**
  5분 격자가 같아 동시 발동이 오히려 흔하고, ⏳ 표식은 fetch→react 사이가 비어 있어
  경합을 다 막지 못한다. 게다가 실행돼야 할 곳이 아닌 디바이스 (구형·클론이 낡은 쪽)
  에서 도는 것 자체가 문제다.

  그래서 **지정 디바이스 한 대에서만 실행**한다. 판정은 `socket.gethostname()`.

    !runner            지금 살아 있는 디바이스들이 각자 자기 이름·상태를 답한다
    !runner <이름>     그 이름을 지정 디바이스로 (모든 디바이스가 같은 값을 저장)
    !runner me         이 명령을 처음 읽은 디바이스… 가 아니라 **모든** 디바이스가
                       자기를 후보로 답한다. 지정은 `!runner <이름>` 으로 명시한다

  지정값은 각 디바이스의 `.vault_data/viz-prefs.json` (git 미추적) 에 들어간다.
  **git 을 거치지 않는다** — 디스코드 채널이 이미 모든 디바이스가 5분마다 읽는
  공용 버스라, 명령 한 번이면 켜져 있는 모든 디바이스가 같은 값을 갖는다.
  지정이 없으면 종전대로 전부 실행한다 (기존 1대 환경 무변경).

반응 표식:
  📥 적재됨 (poll_inbox)      ▶️ 사람이 "지금 실행"       ⏳ 실행 시작
  ✅ 완료                     ❌ 실패
"""
import glob
import io
import json
import os
import re
import socket
import subprocess
import sys
import time
from datetime import datetime

import discord_io as dio
import poll_inbox

GO, RUNNING, DONE, FAIL, BADTAG = '▶️', '⏳', '✅', '❌', '⚠️'
# 상태를 viz 와 **같은 파일**에 둔다. 따로 두면 viz 토글과 폰 `!trigger` 가 어긋난다.
STATE = '.vault_data/viz-prefs.json'
KEY = 'discordTrigger'
# 지정 디바이스 이름. 비어 있으면 "지정 없음" 이라 모든 디바이스가 종전대로 실행한다.
RUNNER_KEY = 'runnerDevice'
DEVICE = socket.gethostname()
# 러너는 이 파일 기준 `../daemon/` 에 있다. 루트 기준 경로를 박으면 배포본처럼 다른
# 위치에 놓였을 때 깨진다 (2026-09-14 — 배포본은 `_tools/agent-daemon/` 에 둔다).
RUNNER = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                       '..', 'daemon', 'Run-AgentTask.ps1'))
# 지시 맨 앞 `[...]` 태그로 에이전트·모델·생각수준을 고른다 (2026-09-09).
# 예: `[codex] 타일 색 봐줘` · `[opus:xhigh] ...` · `[codex:gpt-6-astra:high] ...`
AGENTS = ('claude', 'codex')
EFFORTS = ('minimal', 'low', 'medium', 'high', 'xhigh', 'max')
# **아는 모델만 받는다.** 종전엔 분류 안 되는 토큰을 전부 모델로 넘겼는데, 그러면
# 폰에서 낸 오타 하나가 `-m opusss` 로 나가 회차가 통째로 죽는다 (2026-09-09 실측).
# 목록에 없으면 실행하지 않고 ⚠️ 로 표시한다 — 조용히 기본값으로 도는 것보다,
# 사람이 무엇을 잘못 쳤는지 보는 편이 낫다.
# claude 별칭은 `claude --help`, codex 카탈로그는 codex 실측 (2026-09-09).
MODELS = ('fable', 'opus', 'sonnet', 'haiku',
          'gpt-6-astra', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5')
# ▶️ 가 눌린 메시지를 지시서에 넘기는 파일. 없으면 지시서는 `## 대기 중` 맨 위를 집는다.
# 항목이 여럿 쌓였을 때 사람이 누른 것과 실행되는 것이 어긋나지 않게 한다 (2026-09-03).
# 한글을 PowerShell 인자로 넘기지 않는다 — 인코딩이 깨진다 (Run-AgentTask 설계 원칙 1).
TARGET = '.vault_data/inbox_target.json'
# 개발학습 정리를 여기에 얹는다 (2026-09-09). 종전엔 별도 스케줄 작업이 매 2일 04:37 에
# 돌았는데, 그 시각엔 PC 가 자고 있어 **2회 연속 미실행**이었다 (전원 로그로 확인).
# `WakeToRun` 이 걸려 있어도 전원 옵션의 "절전 해제 타이머 = 중요만" 이 그걸 무시한다.
# 벽시계 시각을 버리고 **마지막 실행 이후 경과 시간**으로 바꾸면 깨어 있을 때만 도니까
# 구조적으로 못 놓친다.
DIGEST_TASK = 'devlearning-digest'
DIGEST_EVERY_H = 48


def _state_path(root):
    return os.path.join(root, STATE)


def _read_prefs(root):
    p = _state_path(root)
    if not os.path.exists(p):
        return {}
    try:
        with io.open(p, encoding='utf-8') as f:
            return json.load(f)
    except ValueError:
        # 파싱 실패를 "기본값" 으로 뭉개면 다음 쓰기가 남의 설정을 날린다 (R196 과 같은 종류).
        raise SystemExit('viz-prefs.json 파싱 실패 — 손상 파일을 덮어쓰지 않는다')


def load_state(root):
    return {'enabled': bool(_read_prefs(root).get(KEY, True))}


def designated(root):
    """지정 디바이스 이름. 없으면 '' — 그때는 모든 디바이스가 실행한다 (종전 동작)."""
    return (_read_prefs(root).get(RUNNER_KEY) or '').strip()


def is_runner(root):
    """이 디바이스가 실행해도 되나. 지정이 없으면 참."""
    d = designated(root)
    return (not d) or d.lower() == DEVICE.lower()


def save_pref(root, key, value):
    """viz-prefs.json 의 해당 키만 바꾼다. 통째로 덮어쓰면 gitAutoSync 등이 날아간다."""
    p = _state_path(root)
    prefs = _read_prefs(root)
    prefs.setdefault('schemaVersion', 1)
    prefs[key] = value
    prefs['updatedAt'] = datetime.now().astimezone().isoformat()
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + '.tmp'
    with io.open(tmp, 'w', encoding='utf-8') as f:
        json.dump(prefs, f, ensure_ascii=False, indent=2)
    os.replace(tmp, p)                      # 원자적 교체 — 반쯤 쓴 파일을 남기지 않는다


def save_state(root, st):
    save_pref(root, KEY, bool(st.get('enabled', True)))


def handle_commands(cfg, root, msgs):
    """`!trigger on|off` · `!runner [이름]` 처리.

    **모든 디바이스가 매번 이 명령들을 다시 읽는다.** 그래야 나중에 켜진 디바이스도
    같은 상태로 수렴한다 — 상태는 디바이스마다 `.vault_data/` 에 따로 있고 git 을
    안 타므로, 명령을 다시 읽는 것 말고는 맞출 방법이 없다.

    그래서 중복 억제를 **✅ 표식이 아니라 값 비교**로 한다 (2026-09-06):

    - 값을 바꾸는 명령 (`!trigger on` · `!runner <이름>`) — 이미 그 값이면 **조용히
      넘어간다.** 바뀔 때만 로그에 답한다. 5분마다 같은 줄이 쌓이지 않는다
    - 물어보는 명령 (`!runner` · `!trigger status`) — 한 번만 답하면 되므로 ✅ 로 거른다

    ✅ 로만 걸렀다면 먼저 켜진 디바이스가 ✅ 를 달아 **나중에 켜진 디바이스가 지정을
    영영 못 읽는다** (봇이 하나라 표식이 공유된다). 그 구멍을 막는 것이 값 비교다.
    """
    hit = False
    for m in msgs:
        if not dio.is_from_allowed_human(cfg, m):
            continue
        txt = (m.get('content') or '').strip().lower()
        answered = dio.has_bot_reaction(m, DONE)

        if txt.startswith('!runner'):
            hit = True
            arg = txt.replace('!runner', '', 1).strip()
            query = (not arg) or arg in ('status', 'me')
            changed = False
            if not query and designated(root).lower() != arg.lower():
                save_pref(root, RUNNER_KEY, arg)
                changed = True
            if changed or (query and not answered):
                dio.send(cfg, 'log', '`!runner` — 이 디바이스 **%s** · 지정 **%s** · %s'
                         % (DEVICE, designated(root) or '없음 (전부 실행)',
                            '실행함' if is_runner(root) else '대기'))

        elif txt.startswith('!trigger'):
            hit = True
            arg = txt.replace('!trigger', '', 1).strip()
            query = arg not in ('on', 'off')
            changed = False
            if not query and load_state(root)['enabled'] != (arg == 'on'):
                save_state(root, {'enabled': arg == 'on'})
                changed = True
            if changed or (query and not answered):
                dio.send(cfg, 'log', '`!trigger` — **%s** (%s)'
                         % ('ON' if load_state(root)['enabled'] else 'OFF', DEVICE))
        else:
            continue

        try:
            dio.react(cfg, 'queue', m['id'], DONE)
        except RuntimeError:
            pass
    return hit


def parse_tag(text):
    """지시 맨 앞 `[...]` 에서 에이전트·모델·생각수준을 뽑는다.

    토큰 **순서를 강제하지 않는다.** `[codex:high]` 든 `[high:codex]` 든 같게 읽는다 —
    폰에서 한 손으로 치는 것이라 순서를 외우게 하면 안 쓴다. 판정은 값으로 한다:
    `claude`/`codex` 는 에이전트, 알려진 생각수준 낱말은 effort, 나머지는 모델.

    태그가 없거나 비면 전부 None — 각 CLI 기본값으로 간다.
    """
    m = re.match(r'\s*\[([^\]\n]{1,80})\]\s*', text or '')
    if not m:
        return {}
    out = {}
    for tok in m.group(1).split(':'):
        tok = tok.strip()
        if not tok:
            continue
        low = tok.lower()
        if low in AGENTS:
            out['agent'] = low
        elif low in EFFORTS:
            out['effort'] = low
        elif low in MODELS:
            out.setdefault('model', low)
        else:
            out.setdefault('unknown', []).append(tok)
    return out


def digest_due(root):
    """마지막 개발학습 회차 이후 `DIGEST_EVERY_H` 시간이 지났나.

    **상태 파일을 따로 두지 않는다** — 러너가 남기는 로그가 이미 상태다. 파일을 하나 더
    두면 로그와 어긋날 수 있고, 어긋나면 어느 쪽이 참인지 판정할 근거가 없다.
    로그가 아예 없으면 처음이라 실행한다 (`hours` 는 None).

    실패한 회차도 로그를 남기므로 48시간 동안 재시도하지 않는다. 종전 스케줄 작업도
    결과와 무관하게 2일 간격이었으니 성질이 같다. 실패 재시도가 필요해지면 그때 넣는다.
    """
    logs = glob.glob(os.path.join(root, '.vault_data', 'logs', DIGEST_TASK + '_*.log'))
    if not logs:
        return True, None
    hours = (time.time() - max(os.path.getmtime(p) for p in logs)) / 3600.0
    return hours >= DIGEST_EVERY_H, hours


def spawn_digest(cfg, root, hours):
    """붙잡지 않고 띄운다.

    스케줄 작업이 `MultipleInstances=IgnoreNew` 라, 여기서 회차 끝까지 기다리면 그 사이
    5분 틱이 전부 버려져 **인박스 ▶️ 가 그동안 죽는다.** 겹침은 러너의
    `devlearning-digest.lock` 이 이미 막으므로 여기서 또 볼 필요가 없다.
    """
    cmd = ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
           RUNNER, '-Task', DIGEST_TASK]
    # **`DETACHED_PROCESS` 를 쓰지 않는다.** 그 플래그를 주면 콘솔이 없어 powershell.exe 가
    # 시작조차 못 한다 (2026-09-09 실측: 파일 하나 쓰는 명령도 안 돌았다. 그 결과 로그가
    # 안 생겨 "마지막 실행" 이 갱신되지 않았고, 5분마다 시작 메시지만 6번 쌓였다).
    # `CREATE_NO_WINDOW` 하나면 창도 안 뜨고 (전체화면 게임이 포커스를 안 잃는다),
    # **부모가 먼저 끝나도 자식은 끝까지 돈다** (같은 날 실측).
    subprocess.Popen(cmd, cwd=root, close_fds=True,
                     creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0),
                     stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                     stderr=subprocess.DEVNULL)
    # **띄운 뒤에 알린다.** 먼저 알리면 띄우기가 실패해도 메시지는 나가고, 로그가 안 생겨
    # 다음 틱이 또 같은 메시지를 보낸다. 위 사고가 정확히 그것이었다.
    dio.send(cfg, 'log', '개발학습 정리 회차 시작 — 마지막 실행 이후 **%s**'
             % ('처음' if hours is None else '%.0f시간' % hours))


def find_trigger(cfg):
    """▶️ 가 눌렸고 아직 봇이 처리 표식을 안 단 메시지."""
    for m in dio.fetch_after(cfg, 'queue', None, limit=30)[::-1]:
        if dio.has_bot_reaction(m, RUNNING) or dio.has_bot_reaction(m, DONE) \
                or dio.has_bot_reaction(m, FAIL) or dio.has_bot_reaction(m, BADTAG):
            continue        # ⚠️ 도 처리 표식이다 — 5분마다 같은 오타를 다시 잡지 않는다
        if dio.triggered_by_allowed(cfg, 'queue', m, GO):
            return m
    return None


def _utf8_stdout():
    """한국어 윈도우 콘솔은 cp949 라 `—` 같은 문자 하나에 출력이 죽는다.

    2026-09-09 실측: 로그 한 줄의 em-dash 때문에 `UnicodeEncodeError` 로 프로세스가
    exit 1 로 끝났다. 집계 줄도 못 찍었다. **선택 항목이 아니라 시작 조건이다.**
    pythonw 로 띄우면 stdout 이 없을 수 있어 유무를 먼저 본다.
    """
    for s in (sys.stdout, sys.stderr):
        if hasattr(s, 'reconfigure'):
            try:
                s.reconfigure(encoding='utf-8')
            except (ValueError, OSError):
                pass


def main():
    args = sys.argv[1:]
    cfg = dio.load_config()
    root = dio.vault_root()

    # 명령 처리가 **가장 먼저**다. 지정 디바이스가 아니어도 `!runner` 는 읽어야
    # 지정이 바뀌는 것을 따라갈 수 있다 (`!trigger` 를 늘 읽는 것과 같은 이유).
    handle_commands(cfg, root, dio.fetch_after(cfg, 'queue', None, limit=20))

    st = load_state(root)
    if '--status' in args:
        print('TRIGGER enabled=%s device=%s designated=%s runner=%s'
              % (st['enabled'], DEVICE, designated(root) or '-', is_runner(root)))
        return
    if not st.get('enabled', True):
        print('TRIGGER disabled=1')
        return

    # 지정 디바이스가 아니면 여기서 끝. **적재(poll_inbox)도 안 한다** —
    # `_INBOX.md` 는 git 추적 파일이라 두 디바이스가 같이 쓰면 커밋이 갈라진다.
    # 이 디바이스의 `_INBOX.md` 는 지정 디바이스가 커밋한 것을 pull 로 받는다.
    if not is_runner(root):
        print('TRIGGER not-runner=1 device=%s designated=%s' % (DEVICE, designated(root)))
        return

    # 적재를 여기서도 돌린다. 종전엔 SessionStart 훅에서만 돌아서 사람이 PC 에서 세션을
    # 열기 전엔 폰 메시지가 `_INBOX.md` 에 안 들어갔고, ▶️ 를 눌러도 지시서 § 0 이
    # "대기 중 비어 있음" 으로 즉시 끝났다 (2026-09-03 실측). 실패해도 트리거는 계속 간다.
    try:
        poll_inbox.main()
    except Exception as exc:                      # noqa: BLE001
        print('POLL_SKIP %s: %s' % (type(exc).__name__, exc))

    msg = find_trigger(cfg)
    if msg is None:
        # 인박스가 빈 틱에서만 개발학습 회차를 본다. 사람이 시킨 것이 늘 먼저고,
        # 두 회차가 같이 도는 것도 피한다.
        # 지시서가 없는 설치 (배포본) 에서는 띄울 것이 없다. 안 보면 러너가 exit 2 로
        # 죽고 로그가 안 남아 **5분마다 시작 메시지만 쌓인다** (R217 과 같은 사고).
        has_digest = os.path.exists(os.path.join(os.path.dirname(RUNNER), 'tasks',
                                                 DIGEST_TASK + '.md'))
        due, hours = digest_due(root) if has_digest else (False, None)
        if due and '--dry-run' not in args:
            spawn_digest(cfg, root, hours)
            print('TRIGGER pending=0 digest=spawned')
        else:
            print('TRIGGER pending=0 digest=%s'
                  % ('due' if due else 'none' if hours is None else '%.0fh' % hours))
        return

    label = ' '.join((msg.get('content') or '(본문 없음)').split())[:80]
    if '--dry-run' in args:
        print('TRIGGER dryrun=1 msg=%s text=%s' % (msg['id'], label))
        return

    tag = parse_tag(msg.get('content') or '')
    if tag.get('unknown'):
        # **모르는 값이 하나라도 있으면 실행하지 않는다.** 태그는 회차의 모델·생각수준을
        # 정하는 것이라, 반만 알아듣고 도는 것이 제일 나쁘다. ⚠️ 를 달아 사람이 보게 한다.
        dio.react(cfg, 'queue', msg['id'], BADTAG)
        dio.send(cfg, 'log',
                 '%s 태그를 못 알아들어 **실행하지 않았다** — `%s`\n'
                 '모르는 값: %s\n'
                 '에이전트 `%s`\n생각수준 `%s`\n모델 `%s`\n'
                 '고쳐서 다시 올리면 된다.'
                 % (BADTAG, label, ' · '.join('`%s`' % u for u in tag['unknown']),
                    '` `'.join(AGENTS), '` `'.join(EFFORTS), '` `'.join(MODELS)))
        print('TRIGGER badtag=%s msg=%s' % (','.join(tag['unknown']), msg['id']))
        return

    # 로그 채널을 여기서 고정한다. 이 뒤의 `'log'` 는 전부 이 에이전트 채널로 가고,
    # 자식 프로세스도 이 환경변수를 물려받아 지시서 § 7 보고가 같은 곳으로 떨어진다.
    os.environ['AIMV_LOG_CHANNEL'] = 'log_' + tag.get('agent', 'claude')

    dio.react(cfg, 'queue', msg['id'], RUNNING)
    dio.send(cfg, 'log', '%s 실행 시작 — `%s`' % (RUNNING, label))

    tpath = os.path.join(root, *TARGET.split('/'))
    os.makedirs(os.path.dirname(tpath), exist_ok=True)
    with io.open(tpath, 'w', encoding='utf-8') as f:
        json.dump({'message_id': msg['id'], 'when': msg['timestamp'][:10],
                   'content': ' '.join((msg.get('content') or '').split())},
                  f, ensure_ascii=False, indent=2)

    cmd = ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
           RUNNER,
           '-Task', 'inbox-task', '-PermissionMode', 'bypassPermissions']
    # 태그가 준 것만 넘긴다. 안 넘기면 러너가 각 CLI 기본값을 쓴다.
    for key, flag in (('agent', '-Agent'), ('model', '-Model'), ('effort', '-Effort')):
        if tag.get(key):
            cmd += [flag, tag[key]]
    if tag:
        dio.send(cfg, 'log', '선택 — 에이전트 **%s** · 모델 **%s** · 생각수준 **%s**'
                 % (tag.get('agent', 'claude (기본)'), tag.get('model', 'CLI 기본'),
                    tag.get('effort', 'CLI 기본')))
    # CREATE_NO_WINDOW — 스케줄러가 5분마다 도는데 콘솔 창이 뜨면 전체화면 게임이
    # 포커스를 잃고 꺼진다 (2026-09-02 사용자 보고). 부모는 pythonw 로 띄운다.
    flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    try:
        r = subprocess.run(cmd, cwd=root, capture_output=True, text=True,
                           encoding='utf-8', errors='replace', creationflags=flags)
    finally:
        # 남겨 두면 다음 회차가 옛 대상을 다시 집는다.
        try:
            os.remove(tpath)
        except OSError:
            pass
    if r.returncode == 75:
        # 러너의 "이전 회차 진행 중". 실패가 아니다 — ⏳ 를 떼어 다음 틱이 다시 집게 한다.
        dio.unreact(cfg, 'queue', msg['id'], RUNNING)
        dio.send(cfg, 'log', '이전 회차가 아직 진행 중이라 넘겼다 — 다음 틱에 다시 시도한다')
        print('TRIGGER locked=1 msg=%s' % msg['id'])
        return
    ok = (r.returncode == 0)

    dio.react(cfg, 'queue', msg['id'], DONE if ok else FAIL)
    if not ok:
        tail = ((r.stdout or '') + (r.stderr or '')).strip()[-600:]
        dio.send(cfg, 'log', '%s 실패 (exit %s)\n```\n%s\n```' % (FAIL, r.returncode, tail))
    print('TRIGGER ran=1 exit=%s msg=%s' % (r.returncode, msg['id']))


def selftest():
    """디바이스 게이트와 중복 억제를 네트워크 없이 검사한다 (`--selftest`).

    디스코드에 붙지 않는다 — `dio` 의 입출력 함수만 갈아 끼우고 임시 루트를 쓴다.
    """
    global DEVICE
    import tempfile
    sent = []
    keep = {k: getattr(dio, k) for k in
            ('send', 'react', 'is_from_allowed_human', 'has_bot_reaction')}
    dio.send = lambda cfg, ch, content, files=None: sent.append(content)
    dio.react = lambda *a, **k: None
    dio.is_from_allowed_human = lambda cfg, m: not m['author'].get('bot')
    dio.has_bot_reaction = lambda m, e: e in m.get('_bot', ())
    cfg = {'channels': {'queue': '1', 'log_claude': '2', 'log_codex': '3'}, 'allowed_authors': ['u1']}
    msg = lambda t, bot=(): {'id': '1', 'content': t,
                             'author': {'id': 'u1'}, '_bot': tuple(bot)}
    try:
        a, b = tempfile.mkdtemp(), tempfile.mkdtemp()

        DEVICE = 'PC-A'
        assert is_runner(a) is True, '지정이 없으면 실행한다 (기존 1대 환경 무변경)'

        handle_commands(cfg, a, [msg('!runner PC-B')])
        assert designated(a) == 'pc-b', designated(a)
        assert is_runner(a) is False, '지정이 남이면 대기'
        assert len(sent) == 1, sent

        handle_commands(cfg, a, [msg('!runner PC-B')])
        assert len(sent) == 1, '같은 값이면 조용히 넘어간다 (5분마다 안 쌓인다)'

        DEVICE = 'PC-B'
        handle_commands(cfg, b, [msg('!runner PC-B', bot=[DONE])])
        assert designated(b) == 'pc-b', '✅ 가 달려 있어도 나중에 켜진 디바이스는 값을 받는다'
        assert is_runner(b) is True, '지정이 자기면 실행'

        DEVICE = 'pc-b'
        assert is_runner(b) is True, '대소문자 무관'

        n = len(sent)
        handle_commands(cfg, b, [msg('!runner', bot=[DONE])])
        assert len(sent) == n, '이미 답한 질문은 다시 안 답한다'
        handle_commands(cfg, b, [msg('!runner')])
        assert len(sent) == n + 1, '안 답한 질문에는 답한다'

        handle_commands(cfg, b, [msg('!trigger off')])
        assert load_state(b)['enabled'] is False
        n = len(sent)
        handle_commands(cfg, b, [msg('!trigger off')])
        assert len(sent) == n, '`!trigger` 도 같은 값이면 조용'

        save_pref(b, 'gitAutoSync', True)
        handle_commands(cfg, b, [msg('!runner PC-C')])
        prefs = _read_prefs(b)
        assert prefs['gitAutoSync'] is True, '남의 키를 안 날린다'
        assert prefs[RUNNER_KEY] == 'pc-c', prefs

        # --- 태그 파싱 (2026-09-09) ---
        assert parse_tag('타일 색 봐줘') == {}, '태그 없으면 빈 dict — CLI 기본값으로 간다'
        assert parse_tag('[codex] 타일') == {'agent': 'codex'}
        assert parse_tag('[opus] 타일') == {'model': 'opus'}, '알려진 낱말이 아니면 모델'
        assert parse_tag('[codex:high] 타일') == {'agent': 'codex', 'effort': 'high'}
        assert parse_tag('[high:codex] 타일') == {'agent': 'codex', 'effort': 'high'}, \
            '순서를 강제하지 않는다'
        assert parse_tag('[codex:gpt-6-astra:high] x') == \
            {'agent': 'codex', 'model': 'gpt-6-astra', 'effort': 'high'}
        assert parse_tag('[CODEX:XHIGH] x') == {'agent': 'codex', 'effort': 'xhigh'}, '대소문자 무관'
        assert parse_tag('  [opus:max] x') == {'model': 'opus', 'effort': 'max'}, '앞 공백 허용'
        assert parse_tag('설명 [codex] 은 중간') == {}, '맨 앞이 아니면 태그가 아니다'
        assert parse_tag('[] x') == {}, '빈 태그는 무시'

        # 모르는 값은 **모델로 넘기지 않는다.** 넘기면 오타가 `-m opusss` 로 나가
        # 회차가 죽는다 (2026-09-09 실측).
        assert parse_tag('[opusss] x') == {'unknown': ['opusss']}, '오타는 unknown 으로'
        assert parse_tag('[codex:hgih] x') == {'agent': 'codex', 'unknown': ['hgih']}, \
            '아는 것은 살리고 모르는 것만 따로 — 무엇이 틀렸는지 보여야 한다'
        assert parse_tag('[codex:gpt-5.6-sol:high] x') == \
            {'agent': 'codex', 'model': 'gpt-5.6-sol', 'effort': 'high'}, '아는 모델은 통과'
        assert 'unknown' not in parse_tag('[fable:xhigh] x'), 'claude 별칭도 아는 모델'

        # 개발학습 48시간 게이트 — 로그 mtime 하나가 상태다
        d = os.path.join(b, '.vault_data', 'logs')
        os.makedirs(d)
        assert digest_due(b) == (True, None), '로그가 없으면 처음이라 실행한다'
        f = os.path.join(d, DIGEST_TASK + '_20260101_000000.log')
        io.open(f, 'w', encoding='utf-8').write('x')
        due, h = digest_due(b)
        assert due is False and h < 1, ('방금 돈 회차면 안 돈다', due, h)
        os.utime(f, (time.time() - 47 * 3600,) * 2)
        assert digest_due(b)[0] is False, '47시간이면 아직'
        os.utime(f, (time.time() - 49 * 3600,) * 2)
        assert digest_due(b)[0] is True, '49시간이면 실행'
        # 다른 작업의 로그는 안 센다
        io.open(os.path.join(d, 'inbox-task_20260101_000000.log'), 'w',
                encoding='utf-8').write('x')
        assert digest_due(b)[0] is True, '인박스 로그는 개발학습 회차가 아니다'
        print('selftest OK')
    finally:
        for k, v in keep.items():
            setattr(dio, k, v)


if __name__ == '__main__':
    _utf8_stdout()
    if '--selftest' in sys.argv[1:]:
        selftest()
        raise SystemExit(0)
    # 스케줄러가 부르므로 실패해도 조용히 끝낸다 — 다음 회차가 다시 시도한다.
    try:
        main()
    except Exception as exc:                      # noqa: BLE001
        print('TRIGGER_SKIP %s: %s' % (type(exc).__name__, exc))
