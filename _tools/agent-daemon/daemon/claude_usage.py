# -*- coding: utf-8 -*-
"""무인 회차 보고에 붙일 두 줄 — "모델·생각수준" 과 "남은 사용량".

왜 있나 — 사용자 지시 (2026-09-04 인박스): *"매회 남은 사용량 정도는 알 수 있으면
한다. 무인 인박스에서 일일이 이 남은 사용량을 알아내려면 너무 많은 과정이 필요하기
때문."* 대화형 `/usage` 는 사람이 PC 앞에 있을 때 얘기고, 폰으로 ▶️ 만 누르는
무인 회차에서는 그 화면을 볼 수가 없다.

출처는 `/usage` 와 **같은 엔드포인트** (`/api/oauth/usage`) 다. 토큰은 Claude Code 가
쓰는 것을 그대로 읽는다 — 이 스크립트는 자격증명을 만들지도, 갱신하지도, 인쇄하지도
않는다. 토큰이 만료됐으면 조회만 실패한다 (직전에 claude 가 돌았으면 갱신돼 있다).

    python claude_usage.py              # 두 줄 인쇄 (모델·생각수준 / 남은 사용량)
    python claude_usage.py --selftest   # 네트워크 없이 형식만 검사

조회에 실패해도 **exit 0 에 한 줄** 을 낸다. 사용량을 못 읽었다고 회차 보고가
통째로 막히면 안 된다.
"""
import glob
import io
import json
import os
import sys
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):      # 한국어 윈도우 콘솔은 cp949 다
    sys.stdout.reconfigure(encoding='utf-8')

URL = 'https://api.anthropic.com/api/oauth/usage'
LABEL = {'session': '5시간', 'weekly_all': '주간', 'weekly_scoped': '주간'}


def _token():
    d = os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')
    with io.open(os.path.join(d, '.credentials.json'), encoding='utf-8') as f:
        return json.load(f)['claudeAiOauth']['accessToken']


def fetch(timeout=20):
    req = urllib.request.Request(URL, headers={
        'Authorization': 'Bearer ' + _token(),
        'anthropic-beta': 'oauth-2025-04-20',
    })
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def _reset(iso):
    """UTC ISO → 로컬 시각. 폰으로 보는 사람이 UTC 를 암산하지 않게."""
    if not iso:
        return ''
    from datetime import datetime
    t = datetime.fromisoformat(iso).astimezone()
    return t.strftime(' %H:%M 리셋') if t.date() == datetime.now().date() \
        else t.strftime(' %m-%d %H:%M 리셋')


def _session_facts():
    """이 세션 트랜스크립트에서 (모델, CLI 버전). 설정 파일에는 model 키가 없고
    (CLI 기본값을 쓴다) env 에도 안 실려서, 실제로 어느 모델이 응답했는지는
    트랜스크립트의 assistant 항목이 유일한 출처다."""
    d = os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')
    sid = os.environ.get('CLAUDE_CODE_SESSION_ID')
    files = glob.glob(os.path.join(d, 'projects', '*', (sid + '.jsonl') if sid else '*.jsonl'))
    if not files:
        return None, None
    model = ver = None
    with io.open(max(files, key=os.path.getmtime), encoding='utf-8', errors='replace') as f:
        for ln in f:
            if '"assistant"' not in ln:
                continue
            try:
                rec = json.loads(ln)
            except ValueError:
                continue
            if rec.get('type') == 'assistant':     # 도중에 모델을 바꿨으면 마지막 것이 맞다
                model = (rec.get('message') or {}).get('model') or model
                ver = rec.get('version') or ver
    return model, ver


def session_line(model=None, effort=None, ver=None):
    """무인 회차가 **어느 모델·생각수준으로 돌았는지** 한 줄 (사용자 지시 2026-09-04).

    폰으로 ▶️ 만 누르는 회차에서는 이 줄이 아니면 알 방법이 없다 — 대화형이라면
    상태줄에 보이는 것이다. 생각수준은 env `CLAUDE_EFFORT` 가 그대로 준다.
    """
    if model is None and ver is None:
        model, ver = _session_facts()
    if effort is None:
        effort = os.environ.get('CLAUDE_EFFORT')
    return '모델 — %s · 생각수준 %s%s' % (model or '알 수 없음', effort or '알 수 없음',
                                          ' · CLI %s' % ver if ver else '')


def line(u):
    """usage 응답 → 보고 한 줄. **남은** 쪽을 적는다 (쓴 쪽이 아니라)."""
    parts = []
    for lim in u.get('limits') or []:
        name = LABEL.get(lim['kind'], lim['kind'])
        scope = (lim.get('scope') or {}).get('model') or {}
        if scope.get('display_name'):
            name += ' ' + scope['display_name']
        warn = ' ⚠' if lim.get('severity') not in (None, 'normal') else ''
        parts.append('%s %d%%%s%s' % (name, 100 - lim['percent'], _reset(lim.get('resets_at')), warn))
    x = u.get('extra_usage') or {}
    if x.get('is_enabled'):
        parts.append('추가 사용량 ON (%.2f/%s 사용)' % (x.get('used_credits') or 0, x.get('monthly_limit')))
    else:
        parts.append('추가 사용량 OFF')
    return '남은 사용량 — ' + ' · '.join(parts)


def selftest():
    sample = {
        'limits': [
            {'kind': 'session', 'percent': 34, 'severity': 'normal', 'resets_at': None},
            {'kind': 'weekly_all', 'percent': 54, 'severity': 'normal', 'resets_at': None},
            {'kind': 'weekly_scoped', 'percent': 77, 'severity': 'warning', 'resets_at': None,
             'scope': {'model': {'display_name': 'Fable'}}},
        ],
        'extra_usage': {'is_enabled': False},
    }
    got = line(sample)
    want = '남은 사용량 — 5시간 66% · 주간 46% · 주간 Fable 23% ⚠ · 추가 사용량 OFF'
    assert got == want, '\n got: %s\nwant: %s' % (got, want)
    on = line({'limits': [], 'extra_usage': {'is_enabled': True, 'used_credits': 3.5,
                                             'monthly_limit': 5000}})
    assert on.endswith('추가 사용량 ON (3.50/5000 사용)'), on
    got = session_line('claude-opus-5', 'high', '2.1.235')
    assert got == '모델 — claude-opus-5 · 생각수준 high · CLI 2.1.235', got
    blank = session_line('', '', '')     # 못 읽어도 줄은 나온다 (보고를 막지 않는다)
    assert blank == '모델 — 알 수 없음 · 생각수준 알 수 없음', blank
    print('selftest OK')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        selftest()
    else:
        print(session_line())
        try:
            print(line(fetch()))
        except Exception as e:
            print('남은 사용량 — 조회 실패 (%s: %s)' % (type(e).__name__, e))
