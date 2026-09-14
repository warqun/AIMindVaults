# -*- coding: utf-8 -*-
"""
디스코드 #inbox 새 메시지 → **멀티볼트 루트** _INBOX.md "대기 중" 에 적재.

적재 위치는 `discord_config.json` 의 `inbox_file` 이 정한다. 2026-09-06 에 게임 볼트
안에서 루트로 올라왔다 — 이 채널이 게임뿐 아니라 멀티볼트 전반·디바이스 제어에
쓰이는데 큐만 한 볼트에 있어 소유가 어긋나 있었다.

작업을 시작하지 않는다. **큐에 넣기만 한다.** 실행은 사람이 앉았을 때
또는 `run_trigger.py` 가 한다 (▶️ 반응, 2026-09-03 신설).

  python poll_inbox.py            평소 실행
  python poll_inbox.py --init     커서만 현재 최신으로 맞추고 적재 안 함
  python poll_inbox.py --dry-run  적재 없이 무엇이 들어올지만 출력

커서는 .vault_data/ 에 둔다 (gitignore) — 디바이스마다 처리 지점이 다르므로
git 으로 옮기면 안 된다.
"""
import io
import json
import os
import re
import sys
from datetime import datetime

import discord_io as dio

MARK = '## 대기 중'


def _load_cursor(path):
    if not os.path.exists(path):
        return None
    with io.open(path, encoding='utf-8') as f:
        return json.load(f).get('last_message_id')


def _save_cursor(path, mid):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, 'w', encoding='utf-8') as f:
        json.dump({'last_message_id': mid,
                   'updated': datetime.now().strftime('%Y-%m-%dT%H:%M:%S')},
                  f, ensure_ascii=False, indent=2)


def _line(msg):
    """메시지 한 건 → 인박스 한 줄. 첨부만 있고 본문이 없는 경우도 흘리지 않는다.

    **`!` 로 시작하면 봇 명령이라 적재하지 않는다** (2026-09-06). `!trigger` ·
    `!runner` 는 `run_trigger.handle_commands` 가 처리하는 제어 명령인데, 여기서
    같이 적재하면 `- [ ] (2026-09-06, discord) !runner ...` 같은 **가짜 작업 항목**이
    큐에 쌓이고 무인 회차가 그것을 처리하려 든다 (실측: `!runner` 를 치자 그대로
    `## 대기 중` 에 들어왔다).
    """
    when = msg['timestamp'][:10]
    body = ' '.join((msg.get('content') or '').split())
    atts = [a['filename'] for a in msg.get('attachments', [])]
    if body.startswith('!'):
        return None
    if not body and not atts:
        return None
    if not body:
        body = '(본문 없음 — 첨부만)'
    if atts:
        body += '  [첨부: %s]' % ', '.join(atts)
    return '- [ ] (%s, discord) %s' % (when, body)


def _append(inbox_path, lines):
    """`## 대기 중` 섹션 **끝**에 붙인다 (FIFO).

    종전엔 머리에 붙여 최신이 맨 위였는데, 지시서가 "맨 위 하나" 를 집으므로
    먼저 던진 지시가 뒤로 밀렸다 (2026-09-03). 위에서 아래로 읽으면 곧 실행 순서다.
    """
    with io.open(inbox_path, encoding='utf-8') as f:
        s = f.read()
    if MARK not in s:
        raise SystemExit('%s 에 "%s" 섹션이 없다' % (inbox_path, MARK))
    i = s.index(MARK)
    end = s.find('\n## ', i + len(MARK))
    if end < 0:
        end = len(s)
    sec = s[i:end]
    # 자리표시자 — 항목이 들어오는데 "(없음)" 이 남아 있으면 읽는 사람이 헷갈린다.
    sec = re.sub(r'^\(없음\)[ \t]*\n?', '', sec, flags=re.M)
    sec = sec.rstrip('\n') + '\n\n' + '\n'.join(lines) + '\n\n'
    out = s[:i] + sec + s[end:]
    out = re.sub(r'\n{3,}', '\n\n', out)   # 반복 적재로 빈 줄이 쌓이지 않게
    with io.open(inbox_path, 'w', encoding='utf-8') as f:
        f.write(out)


def main():
    args = sys.argv[1:]
    cfg = dio.load_config()
    root = dio.vault_root()
    cursor_path = os.path.join(root, cfg['cursor_file'])
    inbox_path = os.path.join(root, cfg['inbox_file'])

    cursor = _load_cursor(cursor_path)
    msgs = dio.fetch_after(cfg, 'queue', cursor, limit=50)

    if '--init' in args:
        if msgs:
            _save_cursor(cursor_path, msgs[-1]['id'])
        print('POLL_INIT last=%s' % (msgs[-1]['id'] if msgs else cursor))
        return

    picked, skipped, lines = [], 0, []
    for m in msgs:
        if not dio.is_from_allowed_human(cfg, m):
            skipped += 1
            continue
        ln = _line(m)
        if ln:
            lines.append(ln)
            picked.append(m)

    if '--dry-run' in args:
        print('POLL_DRYRUN added=%d skipped=%d' % (len(lines), skipped))
        for ln in lines:
            print('   ' + ln)
        return

    if lines:
        _append(inbox_path, lines)
        for m in picked:
            try:
                dio.react(cfg, 'queue', m['id'], '\U0001F4E5')   # 📥 = 적재됨
            except RuntimeError as e:
                print('REACT_FAIL %s' % e)
        dio.send(cfg, 'log', '`poll_inbox` 적재 %d건 → `_INBOX.md`\n%s'
                 % (len(lines), '\n'.join(lines)))

    if msgs:
        _save_cursor(cursor_path, msgs[-1]['id'])

    print('POLL_DONE added=%d skipped=%d cursor=%s'
          % (len(lines), skipped, msgs[-1]['id'] if msgs else cursor))


def selftest():
    """`_line` 의 적재/제외 판정만 검사한다 (`--selftest`, 네트워크 없음)."""
    m = lambda body, atts=(): {'timestamp': '2026-09-06T12:00:00',
                               'content': body,
                               'attachments': [{'filename': a} for a in atts]}
    assert _line(m('타일 색 다시 봐줘')).startswith('- [ ] (2026-09-06, discord)')
    assert _line(m('!runner DESKTOP-X')) is None, '봇 명령은 적재하지 않는다'
    assert _line(m('!trigger off')) is None
    assert _line(m('  !runner x  ')) is None, '앞뒤 공백을 먼저 턴다'
    assert _line(m('')) is None, '본문도 첨부도 없으면 없는 줄'
    assert '[첨부: a.png]' in _line(m('', ['a.png'])), '첨부만 있어도 흘리지 않는다'
    assert _line(m('느낌표! 는 뒤에 있으면 작업이다')) is not None
    print('selftest OK')


if __name__ == '__main__':
    for _s in (sys.stdout, sys.stderr):           # cp949 콘솔 보호 (2026-09-09)
        if hasattr(_s, 'reconfigure'):
            try:
                _s.reconfigure(encoding='utf-8')
            except (ValueError, OSError):
                pass
    if '--selftest' in sys.argv[1:]:
        if hasattr(sys.stdout, 'reconfigure'):   # 한국어 윈도우 콘솔은 cp949 다
            sys.stdout.reconfigure(encoding='utf-8')
        selftest()
        raise SystemExit(0)
    # SessionStart 훅에서 돌므로 **어떤 실패도 세션을 막지 않는다.**
    # 디스코드가 죽었거나 토큰이 없어도 볼트 작업은 계속돼야 한다.
    try:
        main()
    except Exception as exc:                     # noqa: BLE001 — 훅 안전망
        print('POLL_SKIP %s: %s' % (type(exc).__name__, exc))
    except SystemExit as exc:
        if exc.code:
            print('POLL_SKIP %s' % exc)
