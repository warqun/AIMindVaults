# -*- coding: utf-8 -*-
"""
`_AGENT_TASKS/todo/` 의 작업 파일 → 지정 에이전트 CLI 로 실행.

디스코드 인박스가 "폰에서 한 줄" 이라면 이쪽은 "PC 에서 긴 지시" 다. 같은 러너
(`Run-AgentTask.ps1`) 를 쓰고 지시 전달 방식만 다르다 — 인박스는 `_INBOX.md` 의 한 줄,
여기는 파일 한 개.

  python run_agent_tasks.py               todo/ 전부 (파일명 순)
  python run_agent_tasks.py --one         맨 앞 하나만
  python run_agent_tasks.py --dry-run     무엇이 어떻게 돌지만 출력
  python run_agent_tasks.py --file <경로> 그 파일만
  python run_agent_tasks.py --selftest    네트워크·실행 없이 파싱·재귀가드 검사

**스케줄러에 걸지 않는다.** 폴더에 파일을 떨어뜨리는 것만으로 무인 실행이 시작되면
사람이 모르는 사이에 도는 것이 된다. 자동화는 별도 결정 사안이다.

@recursion-guard
  이 폴더의 작업이 이 폴더에 새 작업 파일을 만들면 자기가 자기를 부르는 고리가 된다.
  프롬프트 문구(약속)와 실행 전후 스냅샷 비교(강제) 두 겹으로 막는다. 문구만 두면
  에이전트가 무시했을 때 아무것도 안 남는다.
"""
import argparse
import io
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime

TASKS_DIR = '_AGENT_TASKS'
# 러너는 이 파일과 같은 폴더. 루트 기준 경로를 박으면 배포본처럼 다른 위치에 놓였을 때
# 깨진다 (2026-09-14).
RUNNER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Run-AgentTask.ps1')
AGENTS = ('claude', 'codex')
EFFORTS = ('minimal', 'low', 'medium', 'high', 'xhigh', 'max')


def vault_root(start=None):
    """`Vaults/` + `CLAUDE.md` 가 같이 있는 곳이 루트. 단계 수를 세지 않는다."""
    d = start or os.path.dirname(os.path.abspath(__file__))
    while True:
        if (os.path.isdir(os.path.join(d, 'Vaults'))
                and os.path.isfile(os.path.join(d, 'CLAUDE.md'))):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            raise SystemExit('멀티볼트 루트를 못 찾았다 (기준: Vaults/ + CLAUDE.md)')
        d = parent


def parse_task(path):
    """frontmatter 에서 agent·model·effort 를 읽는다.

    본문은 읽지 않는다 — 에이전트가 자기 Read 도구로 파일을 직접 읽는다
    (한글을 PowerShell 인자로 넘기지 않는다는 러너 설계 원칙 1 과 같은 이유).
    """
    with io.open(path, encoding='utf-8') as f:
        head = f.read(4000)
    out = {'agent': 'claude', 'model': None, 'effort': None}
    m = re.match(r'﻿?---\r?\n(.*?)\r?\n---', head, re.S)
    if not m:
        return out
    for line in m.group(1).splitlines():
        kv = re.match(r'\s*(agent|model|effort)\s*:\s*(.+?)\s*$', line)
        if not kv:
            continue
        val = kv.group(2)
        # 인라인 주석을 떼어낸다. README 예시가 `agent: codex  # 설명` 형태라
        # 그대로 베끼면 값이 통째로 미인식됐다 (2026-09-09 codex 지적, 실측 확인).
        # 앞에 공백이 있는 `#` 만 주석으로 본다 — 모델명에 `#` 이 들어갈 여지를 남긴다.
        val = re.split(r'\s+#', val, 1)[0]
        key, val = kv.group(1), val.strip().strip('"\'')
        if not val:
            continue
        if key == 'agent':
            if val.lower() in AGENTS:
                out['agent'] = val.lower()
        elif key == 'effort':
            if val.lower() in EFFORTS:
                out['effort'] = val.lower()
        else:
            out['model'] = val
    return out


# 러너가 "잠금 때문에 안 돌았다" 를 알리는 종료 코드 (EX_TEMPFAIL).
# 실패(0 이 아님)와도, 성공(0)과도 구별해야 한다.
LOCKED_EXIT = 75


def _todo_snapshot(todo_dir):
    return set(os.listdir(todo_dir)) if os.path.isdir(todo_dir) else set()


def _sweep_recursion(todo_dir, before, log):
    """실행 중에 todo/ 에 생긴 파일을 제거한다 (§ 재귀 금지 두 번째 겹).

    프롬프트 문구는 약속이고 이쪽이 강제다. 지운 것은 반드시 남긴다 — 조용히 지우면
    에이전트가 뭘 하려 했는지 영영 모른다.
    """
    # **`.md` 만 지운다.** README 규약이 그렇고, 확장자를 안 보면 실행 중에 사람이
    # 넣은 파일이나 편집기 임시 파일까지 작성자 구분 없이 지운다 (2026-09-09 codex 지적).
    added = {n for n in _todo_snapshot(todo_dir) - before if n.lower().endswith('.md')}
    for name in sorted(added):
        p = os.path.join(todo_dir, name)
        try:
            with io.open(p, encoding='utf-8') as f:
                first = ' '.join(f.read(300).split())[:160]
        except OSError:
            first = '(읽기 실패)'
        try:
            os.remove(p)
            log.append('RECURSION_BLOCKED %s :: %s' % (name, first))
        except OSError as exc:
            log.append('RECURSION_BLOCKED_FAIL %s :: %s' % (name, exc))
    return added


def run_one(root, path, dry_run=False):
    """작업 파일 하나를 실행하고 (성공여부, 로그줄들) 을 돌려준다.

    성공여부는 3값이다 — True 성공 · False 실패 · **None 은 실행 안 됨**
    (잠금). None 을 False 로 뭉개면 안 돈 작업이 failed/ 로 가고, True 로 뭉개면
    done/ 으로 간다. 둘 다 "돌았다" 는 거짓 기록을 남긴다.
    """
    spec = parse_task(path)
    rel = os.path.relpath(path, root).replace(os.sep, '/')
    todo_dir = os.path.join(root, TASKS_DIR, 'todo')
    lines = ['TASK %s' % rel,
             '  agent=%s model=%s effort=%s'
             % (spec['agent'], spec['model'] or '(CLI 기본)', spec['effort'] or '(CLI 기본)')]

    cmd = ['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
           RUNNER,
           '-Task', 'agent-task', '-Agent', spec['agent'],
           '-PermissionMode', 'bypassPermissions']
    for key, flag in (('model', '-Model'), ('effort', '-Effort')):
        if spec[key]:
            cmd += [flag, spec[key]]
    # 어느 파일을 처리하는지는 환경변수로 넘긴다. 한글 경로·본문을 인자로 넘기지 않는다.
    env = dict(os.environ, AIMV_TASK_FILE=rel,
               AIMV_LOG_CHANNEL='log_' + spec['agent'])

    if dry_run:
        lines.append('  DRYRUN ' + ' '.join(cmd[5:]))
        return True, lines

    before = _todo_snapshot(todo_dir)
    flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    try:
        r = subprocess.run(cmd, cwd=root, capture_output=True, text=True,
                           encoding='utf-8', errors='replace', env=env,
                           creationflags=flags)
        ok = (r.returncode == 0)
        lines.append('  exit=%s' % r.returncode)
        if r.returncode == LOCKED_EXIT:
            # 이전 회차가 아직 돈다. **옮기지 않는다** — 옮기면 실행된 적 없는 작업이
            # done/ 에 쌓인다. todo/ 에 두면 다음 실행이 그대로 집는다.
            lines.append('  SKIP_LOCKED — 이전 회차 진행 중, todo/ 에 남긴다')
            return None, lines
    finally:
        # **`finally` 다.** 자식이 예외로 죽거나 사람이 끊으면 스윕이 안 돌아
        # 재귀로 생긴 파일이 그대로 남는다 (2026-09-09 codex 지적).
        _sweep_recursion(todo_dir, before, lines)

    dest = os.path.join(root, TASKS_DIR, 'done' if ok else 'failed')
    os.makedirs(dest, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    target = os.path.join(dest, '%s_%s' % (stamp, os.path.basename(path)))
    with io.open(path, 'a', encoding='utf-8') as f:
        f.write('\n\n---\n\n## 실행 결과 (%s)\n\n- 에이전트: %s · 모델: %s · 생각수준: %s\n'
                '- 종료 코드: %s\n- 로그: `.vault_data/logs/agent-task_%s_*.log`\n'
                % (stamp, spec['agent'], spec['model'] or 'CLI 기본',
                   spec['effort'] or 'CLI 기본', r.returncode, spec['agent']))
        for ln in lines:
            if ln.startswith('RECURSION_BLOCKED'):
                f.write('- ⛔ %s\n' % ln)
    shutil.move(path, target)
    lines.append('  → %s' % os.path.relpath(target, root).replace(os.sep, '/'))
    return ok, lines


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
    ap = argparse.ArgumentParser()
    ap.add_argument('--one', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--file')
    args = ap.parse_args([a for a in sys.argv[1:] if a != '--selftest'])

    root = vault_root()
    todo_dir = os.path.join(root, TASKS_DIR, 'todo')
    os.makedirs(todo_dir, exist_ok=True)

    if args.file:
        target = os.path.abspath(args.file)
        if os.path.dirname(target) != os.path.abspath(todo_dir):
            raise SystemExit(
                '--file 은 todo/ 안의 파일만 받는다 (실행 후 그 파일을 옮기기 때문이다).\n'
                '  받은 것: %s\n  허용 위치: %s' % (target, os.path.abspath(todo_dir)))
        if not os.path.isfile(target):
            raise SystemExit('그런 파일이 없다: %s' % target)
        targets = [target]
    else:
        targets = [os.path.join(todo_dir, n) for n in sorted(os.listdir(todo_dir))
                   if n.lower().endswith('.md')]
        if args.one:
            targets = targets[:1]

    if not targets:
        print('AGENT_TASKS done=0 (todo 비어 있음)')
        return

    done = failed = locked = 0
    for path in targets:
        ok, lines = run_one(root, path, dry_run=args.dry_run)
        for ln in lines:
            print(ln)
        if not args.dry_run:
            if ok is None:
                locked += 1     # 실행 안 됨 — todo/ 에 그대로 있다
            elif ok:
                done += 1
            else:
                failed += 1
    print('AGENT_TASKS done=%d failed=%d locked=%d' % (done, failed, locked))


def selftest():
    """파싱과 재귀 가드를 실행 없이 검사한다."""
    import tempfile
    d = tempfile.mkdtemp()
    p = os.path.join(d, 't.md')

    io.open(p, 'w', encoding='utf-8').write(
        '---\nagent: codex\nmodel: gpt-6-astra\neffort: high\n---\n\n# 제목\n본문')
    assert parse_task(p) == {'agent': 'codex', 'model': 'gpt-6-astra', 'effort': 'high'}

    io.open(p, 'w', encoding='utf-8').write('---\ntype: agent-task\n---\n\n본문만')
    assert parse_task(p) == {'agent': 'claude', 'model': None, 'effort': None}, \
        'frontmatter 가 있어도 미지정이면 전부 기본값'

    io.open(p, 'w', encoding='utf-8').write('# frontmatter 없음\n본문')
    assert parse_task(p)['agent'] == 'claude', 'frontmatter 없어도 죽지 않는다'

    io.open(p, 'w', encoding='utf-8').write('---\nagent: BOGUS\neffort: 매우높음\n---\nx')
    got = parse_task(p)
    assert got['agent'] == 'claude' and got['effort'] is None, \
        '모르는 값은 조용히 무시하고 기본값 — 오타로 무인 회차를 죽이지 않는다'

    io.open(p, 'w', encoding='utf-8').write('---\nagent: Codex\neffort: XHIGH\n---\nx')
    assert parse_task(p) == {'agent': 'codex', 'model': None, 'effort': 'xhigh'}, '대소문자 무관'

    # README 예시를 그대로 베껴도 읽혀야 한다 — 인라인 주석 때문에 agent 가 미인식되어
    # claude 로 가고 model 이 주석까지 삼키던 버그 (2026-09-09 재현 후 수정).
    io.open(p, 'w', encoding='utf-8').write(
        '---\nagent: codex        # claude (기본) | codex\n'
        'model: gpt-6-astra  # 선택\neffort: high        # 선택\n---\nx')
    assert parse_task(p) == {'agent': 'codex', 'model': 'gpt-6-astra', 'effort': 'high'}, \
        'YAML 인라인 주석을 떼어야 한다'
    io.open(p, 'w', encoding='utf-8').write('---\nmodel: gpt-6#astra\n---\nx')
    assert parse_task(p)['model'] == 'gpt-6#astra', \
        '공백 없는 # 는 값의 일부다 — 주석으로 보지 않는다'

    # 재귀 가드
    todo = os.path.join(d, 'todo')
    os.makedirs(todo)
    io.open(os.path.join(todo, 'orig.md'), 'w', encoding='utf-8').write('원래 있던 것')
    before = _todo_snapshot(todo)
    io.open(os.path.join(todo, 'spawned.md'), 'w', encoding='utf-8').write('작업이 만든 것')
    log = []
    added = _sweep_recursion(todo, before, log)
    assert added == {'spawned.md'}, added
    assert not os.path.exists(os.path.join(todo, 'spawned.md')), '새로 생긴 것은 지운다'
    assert os.path.exists(os.path.join(todo, 'orig.md')), '원래 있던 것은 안 건드린다'
    assert log and log[0].startswith('RECURSION_BLOCKED'), '지운 것은 반드시 남긴다'
    print('selftest OK')


if __name__ == '__main__':
    _utf8_stdout()
    if '--selftest' in sys.argv[1:]:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
        selftest()
        raise SystemExit(0)
    main()
