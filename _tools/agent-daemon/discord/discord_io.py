# -*- coding: utf-8 -*-
"""
Discord 입출력 공용 모듈 — 에이전트 작업용 봇(AgentWorkers) 전용.

커뮤니티 서버용 스크립트(bootstrap_phase1.py 등)와 **봇도 서버도 다르다.**
저쪽은 배포용 공개 서버, 이쪽은 개인 작업 서버다. 설정을 섞지 않는다.

설정: 같은 폴더의 discord_config.json
토큰: 설정의 token_path 가 가리키는 파일. 코드·설정에 토큰 값을 적지 않는다.
"""
import io
import json
import mimetypes
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
import uuid

API = 'https://discord.com/api/v10'
UA = 'DiscordBot (https://github.com/warqun/AIMindVaults, 1.0)'
_HERE = os.path.dirname(os.path.abspath(__file__))
_CTX = ssl.create_default_context()


def load_config(path=None):
    p = path or os.path.join(_HERE, 'discord_config.json')
    with io.open(p, encoding='utf-8') as f:
        return json.load(f)


def vault_root():
    """멀티볼트 루트를 위로 올라가며 찾는다.

    단계 수를 세지 않는다 — 스크립트가 옮겨지면 바로 깨진다 (2026-09-02 실측:
    5 로 세었는데 실제 7 이었다). `Vaults/` 와 `CLAUDE.md` 가 같이 있는 곳이 루트다.
    """
    d = _HERE
    while True:
        if (os.path.isdir(os.path.join(d, 'Vaults'))
                and os.path.isfile(os.path.join(d, 'CLAUDE.md'))):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            raise SystemExit('멀티볼트 루트를 못 찾았다 (기준: Vaults/ + CLAUDE.md) — from %s' % _HERE)
        d = parent


def channel(cfg, key):
    """채널 키 → ID. `'log'` 만 **실행 중인 에이전트에 따라 갈린다.**

    호출부가 어느 에이전트로 도는지 매번 알 필요가 없게 하려고 가상 키로 뒀다.
    러너가 회차 시작 때 `AIMV_LOG_CHANNEL` 을 `log_claude`/`log_codex` 로 넣고,
    그 값이 자식 프로세스(PowerShell → CLI → 에이전트)까지 그대로 상속된다.
    안 넣었으면 `log_claude` — 사람이 손으로 부르는 경우다.
    """
    if key == 'log':
        key = os.environ.get('AIMV_LOG_CHANNEL') or 'log_claude'
    return cfg['channels'][key]


def _token(cfg):
    with io.open(cfg['token_path'], encoding='utf-8-sig') as f:
        t = f.read().strip()
    if t.count('.') != 2:
        raise SystemExit('토큰 형태가 아니다 (점 %d개). 애플리케이션 ID·퍼블릭 키를 넣지 않았는지 확인.'
                         % t.count('.'))
    return t


def _headers(cfg):
    return {'Authorization': 'Bot ' + _token(cfg), 'User-Agent': UA}


def _call(cfg, method, path, data=None, headers=None, timeout=30):
    h = _headers(cfg)
    if headers:
        h.update(headers)
    req = urllib.request.Request(API + path, data=data, method=method, headers=h)
    try:
        body = urllib.request.urlopen(req, context=_CTX, timeout=timeout).read()
    except urllib.error.HTTPError as e:
        detail = e.read()[:400].decode('utf-8', 'replace')
        raise RuntimeError('Discord %s %s -> %s %s' % (method, path, e.code, detail))
    return json.loads(body) if body else None


def get(cfg, path):
    return _call(cfg, 'GET', path)


def send(cfg, channel_key, content, files=None):
    """텍스트 + 선택적 첨부. files 는 로컬 경로 리스트.

    파일명이 `_` 로 시작하면 디스코드가 마크다운 이탤릭으로 먹어 앞 글자가 떨어진다
    (2026-09-02 실측). 그래서 보낼 때 접두 `_` 를 `u_` 로 바꾼다.
    """
    ch = channel(cfg, channel_key)
    files = files or []
    # **멘션은 항상 막는다** (`discord-bot.md § 6`). 로그 보고가 사용자 지시 원문을
    # 그대로 복사하므로, 지시에 `@everyone` 이 들어 있으면 봇이 그것을 실제로
    # 발사한다 (2026-09-09 codex 지적 — 이 봇에만 이 방어가 빠져 있었다).
    payload = {'content': content, 'allowed_mentions': {'parse': []}}
    if not files:
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        return _call(cfg, 'POST', '/channels/%s/messages' % ch, data,
                     {'Content-Type': 'application/json'})

    names = []
    for p in files:
        n = os.path.basename(p)
        names.append('u' + n if n.startswith('_') else n)
    payload['attachments'] = [{'id': i, 'filename': n} for i, n in enumerate(names)]

    b = uuid.uuid4().hex
    parts = [('--%s\r\nContent-Disposition: form-data; name="payload_json"\r\n'
              'Content-Type: application/json\r\n\r\n%s\r\n'
              % (b, json.dumps(payload, ensure_ascii=False))).encode('utf-8')]
    for i, p in enumerate(files):
        ctype = mimetypes.guess_type(p)[0] or 'application/octet-stream'
        parts.append(('--%s\r\nContent-Disposition: form-data; name="files[%d]"; filename="%s"\r\n'
                      'Content-Type: %s\r\n\r\n' % (b, i, names[i], ctype)).encode('utf-8'))
        with io.open(p, 'rb') as f:
            parts.append(f.read())
        parts.append(b'\r\n')
    parts.append(('--%s--\r\n' % b).encode('utf-8'))
    return _call(cfg, 'POST', '/channels/%s/messages' % ch, b''.join(parts),
                 {'Content-Type': 'multipart/form-data; boundary=' + b}, timeout=120)


def fetch_after(cfg, channel_key, after_id=None, limit=50):
    """after_id 이후 메시지를 **오래된 것부터** 돌려준다.

    after 파라미터를 주면 Discord 가 오래된 쪽부터 채워 주지만 응답 순서는 최신순이라
    뒤집어야 한다. after 없이 부르면 최신 limit 건이라 커서 초기화에만 쓴다.
    """
    q = '/channels/%s/messages?limit=%d' % (channel(cfg, channel_key), limit)
    if after_id:
        q += '&after=%s' % after_id
    return list(reversed(get(cfg, q)))


def react(cfg, channel_key, message_id, emoji):
    ch = channel(cfg, channel_key)
    _call(cfg, 'PUT', '/channels/%s/messages/%s/reactions/%s/@me'
          % (ch, message_id, urllib.parse.quote(emoji)), b'', {'Content-Length': '0'})


def unreact(cfg, channel_key, message_id, emoji):
    """봇이 단 반응을 뗀다. 처리 표식을 되돌려 다음 회차가 다시 집게 할 때 쓴다."""
    _call(cfg, 'DELETE', '/channels/%s/messages/%s/reactions/%s/@me'
          % (channel(cfg, channel_key), message_id, urllib.parse.quote(emoji)))


def is_from_allowed_human(cfg, msg):
    """봇 자기 메시지 무시 + 작성자 화이트리스트.

    이걸 빼면 채널에 들어온 아무나가 인박스에 지시를 넣을 수 있고,
    봇이 자기 메시지를 다시 읽는 되먹임도 생긴다.
    """
    a = msg.get('author', {})
    return (not a.get('bot')) and a.get('id') in cfg['allowed_authors']

def reaction_users(cfg, channel_key, message_id, emoji):
    """그 반응을 누른 사람 목록. 반응 요약(count)만 보면 누가 눌렀는지 모른다."""
    return get(cfg, '/channels/%s/messages/%s/reactions/%s'
               % (channel(cfg, channel_key), message_id, urllib.parse.quote(emoji)))


def has_bot_reaction(msg, emoji):
    """봇이 이미 그 반응을 달았나 — 처리 완료 표식으로 쓴다."""
    for r in msg.get('reactions', []):
        if r['emoji']['name'] == emoji and r.get('me'):
            return True
    return False


def triggered_by_allowed(cfg, channel_key, msg, emoji):
    """화이트리스트 사용자가 그 반응을 눌렀나."""
    for r in msg.get('reactions', []):
        if r['emoji']['name'] != emoji:
            continue
        try:
            users = reaction_users(cfg, channel_key, msg['id'], emoji)
        except RuntimeError:
            return False
        return any(u['id'] in cfg['allowed_authors'] for u in users)
    return False
