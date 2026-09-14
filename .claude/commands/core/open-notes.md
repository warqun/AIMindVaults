---
description: "여러 Obsidian 노트를 각각 새 탭으로 열기"
---

# /open-notes — 복수 노트 새 탭 열기

## 용도

지정한 Obsidian 노트 여러 개를 각각 새 탭으로 열어 동시에 참조할 수 있게 한다.

## 전제조건

- `local-rest-api` 플러그인이 대상 볼트에 설치·활성화되어 있어야 함 (Core 플러그인)
- Obsidian이 대상 볼트를 열고 있어야 함

## 방식

`obsidian://open` URI는 같은 탭에서 교체되므로 사용하지 않는다.
`local-rest-api`의 REST 엔드포인트 2단계 호출로 새 탭 생성 후 파일을 연다.

## 실행 절차

### 1. 대상 파일 목록 확정

- 인자로 노트 경로/제목/키워드가 주어지면 Glob으로 검색하여 경로 특정
- 볼트명이 명시되지 않으면 경로에서 추출 또는 사용자에게 확인

### 2. 활성 볼트 판별 (필수)

Obsidian에서 **현재 열려 있는 볼트**를 확인한다. 멀티볼트 환경에서는 개별 볼트가 독립으로 열려 있으므로, API에 전달할 경로 기준이 달라진다.

```python
import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://localhost:27124/vault/',
    headers={'Authorization': f'Bearer {api_key}', 'Accept': 'application/json'})
resp = urllib.request.urlopen(req, context=ctx)
vault_info = json.loads(resp.read())
# vault_info 에서 현재 볼트 루트 경로 확인
```

### 3. 경로 변환 (필수)

AIMindVaults 루트 기준 경로를 **활성 볼트 기준 상대경로**로 변환한다.

```python
# 예: AIMindVaults 루트 기준
full_path = 'Vaults/Projects_Game/JissouGame/Contents/Project/02-design/개체/파일.md'

# 활성 볼트가 JissouGame이면 → 볼트 경로 접두사 제거
vault_prefix = 'Vaults/Projects_Game/JissouGame/'
vault_relative = full_path.removeprefix(vault_prefix)
# 결과: 'Contents/Project/02-design/개체/파일.md'
```

**변환 규칙:**
- 대상 파일의 디스크 경로에서 볼트 루트까지의 접두사를 제거
- 볼트 레지스트리 (루트 `CLAUDE.md`)의 볼트 경로와 대조하여 접두사 특정
- 접두사 불일치 시 (= 다른 볼트의 파일) → 사용자에게 볼트 전환 안내

### 4. API 키 읽기

```python
import json
api_key = json.load(open('{볼트경로}/.obsidian/plugins/obsidian-local-rest-api/data.json'))['apiKey']
```

### 5. 파일 존재 확인 (필수 — 안전장치)

**`/open/` 호출 전에 반드시 파일 존재를 확인한다.** `/open/`은 파일이 없으면 새 빈 파일을 자동 생성하므로, 확인 없이 호출하면 쓰레기 파일이 생긴다.

```python
def check_file_exists(filepath):
    encoded = urllib.parse.quote(filepath, safe='/')
    req = urllib.request.Request(f'{base}/vault/{encoded}',
        headers={'Authorization': f'Bearer {api_key}', 'Accept': 'application/vnd.olrapi.note+json'})
    try:
        urllib.request.urlopen(req, context=ctx)
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise
```

### 6. 노트별 새 탭 열기 (Python)

```python
import urllib.request, urllib.parse, json, ssl, time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

base = 'https://localhost:27124'

def do_post(path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(base + path, data=data, method='POST',
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req, context=ctx)
    return resp.status

def open_in_new_tab(filepath):
    if not check_file_exists(filepath):
        print(f'SKIP: 파일 없음 - {filepath}')
        return False
    do_post('/commands/workspace:new-tab')       # 204 = 새 탭 생성
    time.sleep(0.3)
    encoded = urllib.parse.quote(filepath, safe='/')
    do_post(f'/open/{encoded}')                   # 200 = 파일 열기
    return True
```

### 7. 볼트가 아직 안 열려 있으면

```bash
start "" "obsidian://open?vault=볼트명"
```

3초 대기 후 REST API 호출 진행.

## 핵심 API 레퍼런스

| 엔드포인트 | 메서드 | 응답 | 용도 |
|-----------|--------|------|------|
| `/vault/{filepath}` | GET | 200/404 | **파일 존재 확인 (open 전 필수)** |
| `/commands/workspace:new-tab` | POST | 204 | 새 탭 생성 |
| `/open/{filepath}` | POST | 200 | 현재 활성 탭에 파일 열기 |
| `/commands/` | GET | 200 | 사용 가능한 명령어 목록 |
| `/` | GET | 200 | API 상태 확인 |

- HTTPS 포트 27124 (self-signed cert → ssl verify 비활성 필요)
- HTTP 포트 27123 (인증 없이 상태 확인만 가능)
- 한글 경로는 `urllib.parse.quote` 필수
- curl은 한글 인코딩 문제가 있으므로 Python urllib 권장

## 경고

- **`/open/`은 파일이 없으면 새 빈 파일을 자동 생성한다.** 경로 검증 없이 호출하면 쓰레기 파일/폴더가 생성된다.
- **경로는 반드시 활성 볼트 기준 상대경로여야 한다.** AIMindVaults 루트 기준 경로를 그대로 넣으면 볼트 안에 잘못된 중첩 폴더가 생성된다.
- 이슈 상세: [[20260406_open-notes_경로불일치_빈파일생성_이슈]]

## 사용 예시

```
/open-notes JissouGame 비구더기_플레이어조작_설계, 저실장_플레이어조작_설계
/open-notes AIHubVault _STATUS, _WORKSPACE_VERSION
```

## 제한사항

- 대상 볼트가 Obsidian에서 열려 있어야 REST API 접근 가능
- API 키는 볼트마다 다름 — 열려 있는 볼트의 키를 읽어야 함
- 탭 생성과 파일 열기 사이 0.3초 딜레이 필요 (Obsidian 내부 처리 시간)

## /open-note와의 차이

| | /open-note | /open-notes |
|---|-----------|------------|
| 방식 | Advanced URI 플러그인 | local-rest-api 플러그인 |
| 탭 | 단일 (기존 탭 교체) | 복수 (각각 새 탭) |
| 용도 | 노트 1개 빠르게 열기 | 관련 노트 여러 개 동시 참조 |
