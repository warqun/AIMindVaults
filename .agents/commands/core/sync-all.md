# /sync-all — 전체 위성 볼트 워크스페이스 동기화

AIHubVault 기준으로 모든 위성 볼트의 워크스페이스를 최신 상태로 동기화한다.
각 볼트에서 `aimv sync`를 순차 실행하는 일괄 동기화.

## 사용법

```
/sync-all [옵션]
```

예시:
- `/sync-all` — 전체 위성 볼트 동기화
- `/sync-all --dry-run` — 미리보기만 (실제 동기화 없음)
- `/sync-all --exclude TestVault` — 특정 볼트 제외

## 실행 절차

### 1. 전체 동기화 실행

각 위성 볼트 디렉토리에서 Node.js CLI를 순차 실행:

```bash
# 각 위성 볼트에 대해:
node "{볼트경로}/.sync/_tools/cli-node/bin/cli.js" sync -r "{볼트경로}"
```

또는 Glob으로 `cli.js`를 가진 볼트를 자동 탐지하여 순회한다. AIHubVault는 소스이므로 제외.

### 2. 결과 확인

- 각 볼트마다 `SYNC_RESULT=` 로그가 출력된다.
- `SYNC_RESULT=OK` 또는 `SYNC_RESULT=ALREADY_LATEST` → 정상
- `SYNC_RESULT=ERROR` → 해당 볼트 개별 확인 필요

## 파라미터

| 파라미터 | 용도 | 기본값 |
|---------|------|--------|
| `--dry-run` | DryRun 플래그를 각 `aimv sync`에 전달 | false |
| `--exclude <볼트명>` | 지정 볼트 건너뛰기 (복수 가능) | 없음 |

## hub-broadcast와의 차이

| 항목 | /sync-all | /hub-broadcast |
|------|-----------|----------------|
| 범위 | 전체 workspace (모든 sync 대상 파일) | 특정 파일 1개 |
| 방식 | 버전 비교 기반 양방향 | Hub → 위성 단방향 강제 복사 |
| 용도 | 정기 전체 최신화 | 특정 파일 긴급 전파 |
| 속도 | 느림 (볼트당 버전 비교 + 해시 체크) | 빠름 (단순 복사) |

## 동작 규칙

- AIHubVault는 소스이므로 자신에게 동기화하지 않는다.
- 각 볼트의 `_WORKSPACE_VERSION.md`를 Hub과 비교하여 차이가 있는 볼트만 실제 파일 복사가 발생한다.
- 이미 최신인 볼트는 `ALREADY_LATEST`로 빠르게 건너뛴다.
- 동기화 후 각 볼트의 `_WORKSPACE_VERSION.md`가 Hub 버전으로 갱신된다.

## 권장 사용 시점

- Hub에서 workspace 편집 완료 후 전체 반영할 때
- 새 볼트를 여러 개 생성한 후 일괄 초기화할 때
- 오랜만에 동기화 상태를 점검할 때
